require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand, DeleteCommand, GetCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const jwksRsa = require('jwks-rsa');

// ── Logger ──────────────────────────────────────────────
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

const app = express();
const PORT = process.env.PORT || 3005;

// ── AWS Clients ─────────────────────────────────────────
const s3 = new S3Client({ region: process.env.AWS_REGION || 'eu-west-2' });
const ddb = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-west-2' })
);

const BUCKET = process.env.S3_BUCKET || 'securecloud-dev-files';
const TABLE_META = process.env.DYNAMODB_TABLE_METADATA || 'securecloud-dev-file-metadata';
const TABLE_AUDIT = process.env.DYNAMODB_TABLE_AUDIT || 'securecloud-dev-audit-logs';
const TABLE_SHARES = process.env.DYNAMODB_TABLE_SHARES || 'securecloud-dev-file-shares';

// ── Middleware ───────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('short', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});
app.use('/api/', limiter);

// ── Cognito JWT Auth ────────────────────────────────────
const REGION = process.env.AWS_REGION || 'eu-west-2';
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const ISSUER = `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`;

const jwksClient = jwksRsa({
  jwksUri: `${ISSUER}/.well-known/jwks.json`,
  cache: true,
  rateLimit: true,
});

function auth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });

  jwt.verify(token, (header, cb) => {
    jwksClient.getSigningKey(header.kid, (err, key) => {
      cb(err, key?.getPublicKey());
    });
  }, {
    algorithms: ['RS256'],
    issuer: ISSUER,
  }, (err, decoded) => {
    if (err) {
      logger.warn('Auth failed', { error: err.message });
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      groups: decoded['cognito:groups'] || ['user'],
    };
    next();
  });
}

// ── Validation helpers ──────────────────────────────────
function validateFileName(name) {
  if (!name || typeof name !== 'string') return false;
  if (name.length > 255) return false;
  if (/[<>:"/\\|?*\x00-\x1f]/.test(name)) return false;
  return true;
}

function validateEmail(email) {
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ── Audit helper ────────────────────────────────────────
async function audit(userId, action, details) {
  await ddb.send(new PutCommand({
    TableName: TABLE_AUDIT,
    Item: { log_id: uuidv4(), timestamp: new Date().toISOString(), user_id: userId, action, details },
  })).catch(e => logger.error('Audit write failed', { error: e.message }));
}

// ── Health ──────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ── Upload (presigned URL) ──────────────────────────────
app.post('/api/files/upload-url', auth, async (req, res) => {
  try {
    const { fileName, fileType, fileSize } = req.body;
    if (!validateFileName(fileName)) return res.status(400).json({ error: 'Invalid file name' });
    if (!fileType) return res.status(400).json({ error: 'File type is required' });

    const fileId = uuidv4();
    const s3Key = `${req.user.id}/${fileId}/${fileName}`;

    const url = await getSignedUrl(s3, new PutObjectCommand({
      Bucket: BUCKET, Key: s3Key, ContentType: fileType,
      ServerSideEncryption: 'aws:kms',
      SSEKMSKeyId: process.env.KMS_KEY_ID,
    }), { expiresIn: 300 });

    await ddb.send(new PutCommand({
      TableName: TABLE_META,
      Item: { file_id: fileId, user_id: req.user.id, file_name: fileName, file_type: fileType, file_size: fileSize || 0, s3_key: s3Key, created_at: new Date().toISOString() },
    }));

    await audit(req.user.id, 'UPLOAD', { fileId, fileName });
    logger.info('File upload initiated', { userId: req.user.id, fileId, fileName });
    res.json({ uploadUrl: url, fileId });
  } catch (err) {
    logger.error('Upload failed', { error: err.message, userId: req.user?.id });
    res.status(500).json({ error: 'Upload failed' });
  }
});

// ── Download (presigned URL) ────────────────────────────
app.get('/api/files/:fileId/download', auth, async (req, res) => {
  try {
    const file = (await ddb.send(new GetCommand({
      TableName: TABLE_META, Key: { file_id: req.params.fileId, user_id: req.user.id },
    }))).Item;
    if (!file) return res.status(404).json({ error: 'File not found' });

    const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: file.s3_key }), { expiresIn: 300 });
    await audit(req.user.id, 'DOWNLOAD', { fileId: req.params.fileId });
    logger.info('File download', { userId: req.user.id, fileId: req.params.fileId });
    res.json({ downloadUrl: url, fileName: file.file_name });
  } catch (err) {
    logger.error('Download failed', { error: err.message, userId: req.user?.id });
    res.status(500).json({ error: 'Download failed' });
  }
});

// ── List files ──────────────────────────────────────────
app.get('/api/files', auth, async (req, res) => {
  try {
    const result = await ddb.send(new QueryCommand({
      TableName: TABLE_META, IndexName: 'user-files-index',
      KeyConditionExpression: 'user_id = :uid',
      ExpressionAttributeValues: { ':uid': req.user.id },
      ScanIndexForward: false,
      Limit: 100,
    }));
    res.json({ files: result.Items || [] });
  } catch (err) {
    logger.error('List files failed', { error: err.message, userId: req.user?.id });
    res.status(500).json({ error: 'List failed' });
  }
});

// ── Delete file ─────────────────────────────────────────
app.delete('/api/files/:fileId', auth, async (req, res) => {
  try {
    const file = (await ddb.send(new GetCommand({
      TableName: TABLE_META, Key: { file_id: req.params.fileId, user_id: req.user.id },
    }))).Item;
    if (!file) return res.status(404).json({ error: 'File not found' });

    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: file.s3_key }));
    await ddb.send(new DeleteCommand({ TableName: TABLE_META, Key: { file_id: req.params.fileId, user_id: req.user.id } }));
    await audit(req.user.id, 'DELETE', { fileId: req.params.fileId, fileName: file.file_name });
    logger.info('File deleted', { userId: req.user.id, fileId: req.params.fileId });
    res.json({ message: 'Deleted' });
  } catch (err) {
    logger.error('Delete failed', { error: err.message, userId: req.user?.id });
    res.status(500).json({ error: 'Delete failed' });
  }
});

// ── Share file ──────────────────────────────────────────
app.post('/api/files/:fileId/share', auth, async (req, res) => {
  try {
    const { email, permission } = req.body;
    if (!validateEmail(email)) return res.status(400).json({ error: 'Valid email is required' });
    if (permission && !['read', 'write'].includes(permission)) {
      return res.status(400).json({ error: 'Permission must be read or write' });
    }

    // Verify file ownership before sharing
    const file = (await ddb.send(new GetCommand({
      TableName: TABLE_META, Key: { file_id: req.params.fileId, user_id: req.user.id },
    }))).Item;
    if (!file) return res.status(404).json({ error: 'File not found or not owned by you' });

    const shareId = uuidv4();
    await ddb.send(new PutCommand({
      TableName: TABLE_SHARES,
      Item: {
        share_id: shareId, file_id: req.params.fileId, owner_id: req.user.id,
        shared_with_user_id: email, permission: permission || 'read',
        file_name: file.file_name, created_at: new Date().toISOString(),
      },
    }));
    await audit(req.user.id, 'SHARE', { fileId: req.params.fileId, email, permission: permission || 'read' });
    logger.info('File shared', { userId: req.user.id, fileId: req.params.fileId, sharedWith: email });
    res.json({ shareId });
  } catch (err) {
    logger.error('Share failed', { error: err.message, userId: req.user?.id });
    res.status(500).json({ error: 'Share failed' });
  }
});

// ── Shared with me ──────────────────────────────────────
app.get('/api/shared', auth, async (req, res) => {
  try {
    const result = await ddb.send(new QueryCommand({
      TableName: TABLE_SHARES, IndexName: 'user-shared-files-index',
      KeyConditionExpression: 'shared_with_user_id = :email',
      ExpressionAttributeValues: { ':email': req.user.email },
    }));
    res.json({ shares: result.Items || [] });
  } catch (err) {
    logger.error('Shared files fetch failed', { error: err.message, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to fetch shared files' });
  }
});

// ── Download shared file ────────────────────────────────
app.get('/api/shared/:shareId/download', auth, async (req, res) => {
  try {
    const share = (await ddb.send(new GetCommand({
      TableName: TABLE_SHARES, Key: { share_id: req.params.shareId },
    }))).Item;
    if (!share || share.shared_with_user_id !== req.user.email) {
      return res.status(404).json({ error: 'Share not found' });
    }

    // Get file metadata from owner
    const file = (await ddb.send(new GetCommand({
      TableName: TABLE_META, Key: { file_id: share.file_id, user_id: share.owner_id },
    }))).Item;
    if (!file) return res.status(404).json({ error: 'Original file no longer exists' });

    const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: file.s3_key }), { expiresIn: 300 });
    await audit(req.user.id, 'DOWNLOAD_SHARED', { fileId: share.file_id, shareId: req.params.shareId });
    res.json({ downloadUrl: url, fileName: file.file_name });
  } catch (err) {
    logger.error('Shared download failed', { error: err.message, userId: req.user?.id });
    res.status(500).json({ error: 'Download failed' });
  }
});

// ── Audit logs (admin) ─────────────────────────────────
app.get('/api/audit', auth, async (req, res) => {
  try {
    if (!req.user.groups.includes('admin')) return res.status(403).json({ error: 'Admin only' });
    const result = await ddb.send(new QueryCommand({
      TableName: TABLE_AUDIT, IndexName: 'user-audit-index',
      KeyConditionExpression: 'user_id = :uid',
      ExpressionAttributeValues: { ':uid': req.query.userId || req.user.id },
      ScanIndexForward: false, Limit: 50,
    }));
    res.json({ logs: result.Items || [] });
  } catch (err) {
    logger.error('Audit fetch failed', { error: err.message, userId: req.user?.id });
    res.status(500).json({ error: 'Audit fetch failed' });
  }
});

app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
module.exports = app;
