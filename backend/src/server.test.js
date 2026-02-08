const request = require('supertest');

// ── Mock AWS SDK clients before requiring server ──────────
const mockS3Send = jest.fn().mockResolvedValue({});
const mockDdbSend = jest.fn().mockResolvedValue({ Items: [], Item: null });
const mockGetSignedUrl = jest.fn().mockResolvedValue('https://s3.example.com/presigned-url');

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(() => ({ send: mockS3Send })),
  PutObjectCommand: jest.fn((params) => ({ ...params, _type: 'PutObject' })),
  GetObjectCommand: jest.fn((params) => ({ ...params, _type: 'GetObject' })),
  DeleteObjectCommand: jest.fn((params) => ({ ...params, _type: 'DeleteObject' })),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: mockGetSignedUrl,
}));

jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn(() => ({})),
}));

jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: jest.fn(() => ({ send: mockDdbSend })) },
  PutCommand: jest.fn((params) => ({ ...params, _type: 'Put' })),
  QueryCommand: jest.fn((params) => ({ ...params, _type: 'Query' })),
  DeleteCommand: jest.fn((params) => ({ ...params, _type: 'Delete' })),
  GetCommand: jest.fn((params) => ({ ...params, _type: 'Get' })),
  ScanCommand: jest.fn((params) => ({ ...params, _type: 'Scan' })),
}));

// Mock JWT verification to bypass Cognito auth
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn((token, getKey, options, callback) => {
    if (token === 'valid-token') {
      callback(null, {
        sub: 'user-123',
        email: 'test@securecloud.dev',
        'cognito:groups': ['admin'],
      });
    } else if (token === 'user-token') {
      callback(null, {
        sub: 'user-456',
        email: 'user@securecloud.dev',
        'cognito:groups': ['user'],
      });
    } else {
      callback(new Error('Invalid token'));
    }
  }),
}));

jest.mock('jwks-rsa', () => jest.fn(() => ({
  getSigningKey: jest.fn(),
})));

const app = require('./server');

// ── Helpers ────────────────────────────────────────────────
const authHeader = (token = 'valid-token') => ({ Authorization: `Bearer ${token}` });

beforeEach(() => {
  jest.clearAllMocks();
  mockDdbSend.mockResolvedValue({ Items: [], Item: null });
  mockS3Send.mockResolvedValue({});
  mockGetSignedUrl.mockResolvedValue('https://s3.example.com/presigned-url');
});

// ── Health endpoint ────────────────────────────────────────
describe('GET /health', () => {
  it('returns ok status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });
});

// ── Authentication ─────────────────────────────────────────
describe('Authentication', () => {
  it('rejects requests without a token', async () => {
    const res = await request(app).get('/api/files');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('No token provided');
  });

  it('rejects requests with an invalid token', async () => {
    const res = await request(app).get('/api/files').set('Authorization', 'Bearer bad-token');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid or expired token');
  });

  it('allows requests with a valid token', async () => {
    mockDdbSend.mockResolvedValue({ Items: [] });
    const res = await request(app).get('/api/files').set(authHeader());
    expect(res.status).toBe(200);
  });
});

// ── Upload (presigned URL) ─────────────────────────────────
describe('POST /api/files/upload-url', () => {
  it('returns a presigned upload URL', async () => {
    mockDdbSend.mockResolvedValue({});
    const res = await request(app)
      .post('/api/files/upload-url')
      .set(authHeader())
      .send({ fileName: 'test.pdf', fileType: 'application/pdf', fileSize: 1024 });

    expect(res.status).toBe(200);
    expect(res.body.uploadUrl).toBe('https://s3.example.com/presigned-url');
    expect(res.body.fileId).toBeDefined();
  });

  it('rejects an invalid file name', async () => {
    const res = await request(app)
      .post('/api/files/upload-url')
      .set(authHeader())
      .send({ fileName: '', fileType: 'application/pdf' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid file name');
  });

  it('rejects file names with special characters', async () => {
    const res = await request(app)
      .post('/api/files/upload-url')
      .set(authHeader())
      .send({ fileName: 'file<script>.txt', fileType: 'text/plain' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid file name');
  });

  it('rejects when file type is missing', async () => {
    const res = await request(app)
      .post('/api/files/upload-url')
      .set(authHeader())
      .send({ fileName: 'test.pdf' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('File type is required');
  });
});

// ── List files ─────────────────────────────────────────────
describe('GET /api/files', () => {
  it('returns user files', async () => {
    const mockFiles = [
      { file_id: 'f1', file_name: 'doc.pdf', file_size: 1024, created_at: '2025-01-01T00:00:00Z' },
      { file_id: 'f2', file_name: 'img.png', file_size: 2048, created_at: '2025-01-02T00:00:00Z' },
    ];
    mockDdbSend.mockResolvedValue({ Items: mockFiles });

    const res = await request(app).get('/api/files').set(authHeader());
    expect(res.status).toBe(200);
    expect(res.body.files).toHaveLength(2);
    expect(res.body.files[0].file_name).toBe('doc.pdf');
  });

  it('returns empty array when no files exist', async () => {
    mockDdbSend.mockResolvedValue({ Items: [] });
    const res = await request(app).get('/api/files').set(authHeader());
    expect(res.status).toBe(200);
    expect(res.body.files).toEqual([]);
  });
});

// ── Download ───────────────────────────────────────────────
describe('GET /api/files/:fileId/download', () => {
  it('returns a presigned download URL for owned file', async () => {
    mockDdbSend.mockResolvedValue({ Item: { file_id: 'f1', user_id: 'user-123', s3_key: 'user-123/f1/doc.pdf', file_name: 'doc.pdf' } });
    const res = await request(app).get('/api/files/f1/download').set(authHeader());
    expect(res.status).toBe(200);
    expect(res.body.downloadUrl).toBe('https://s3.example.com/presigned-url');
    expect(res.body.fileName).toBe('doc.pdf');
  });

  it('returns 404 for non-existent file', async () => {
    mockDdbSend.mockResolvedValue({ Item: null });
    const res = await request(app).get('/api/files/nonexistent/download').set(authHeader());
    expect(res.status).toBe(404);
  });
});

// ── Delete file ────────────────────────────────────────────
describe('DELETE /api/files/:fileId', () => {
  it('deletes an owned file', async () => {
    mockDdbSend
      .mockResolvedValueOnce({ Item: { file_id: 'f1', user_id: 'user-123', s3_key: 'user-123/f1/doc.pdf', file_name: 'doc.pdf' } })
      .mockResolvedValueOnce({}) // S3 delete (via ddb for audit)
      .mockResolvedValueOnce({}) // DynamoDB delete
      .mockResolvedValueOnce({}); // Audit write

    const res = await request(app).delete('/api/files/f1').set(authHeader());
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Deleted');
  });

  it('returns 404 when file not found', async () => {
    mockDdbSend.mockResolvedValue({ Item: null });
    const res = await request(app).delete('/api/files/nonexistent').set(authHeader());
    expect(res.status).toBe(404);
  });
});

// ── Share file ─────────────────────────────────────────────
describe('POST /api/files/:fileId/share', () => {
  it('shares a file with a valid email', async () => {
    mockDdbSend
      .mockResolvedValueOnce({ Item: { file_id: 'f1', user_id: 'user-123', file_name: 'doc.pdf' } })
      .mockResolvedValueOnce({}) // PutCommand for share
      .mockResolvedValueOnce({}); // Audit

    const res = await request(app)
      .post('/api/files/f1/share')
      .set(authHeader())
      .send({ email: 'friend@example.com', permission: 'read' });

    expect(res.status).toBe(200);
    expect(res.body.shareId).toBeDefined();
  });

  it('rejects invalid email', async () => {
    const res = await request(app)
      .post('/api/files/f1/share')
      .set(authHeader())
      .send({ email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Valid email is required');
  });

  it('rejects invalid permission', async () => {
    const res = await request(app)
      .post('/api/files/f1/share')
      .set(authHeader())
      .send({ email: 'friend@example.com', permission: 'admin' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Permission must be read or write');
  });

  it('returns 404 when file not owned', async () => {
    mockDdbSend.mockResolvedValue({ Item: null });
    const res = await request(app)
      .post('/api/files/f1/share')
      .set(authHeader())
      .send({ email: 'friend@example.com' });

    expect(res.status).toBe(404);
  });
});

// ── Shared with me ─────────────────────────────────────────
describe('GET /api/shared', () => {
  it('returns files shared with the current user', async () => {
    const shares = [
      { share_id: 's1', file_id: 'f1', file_name: 'shared.pdf', owner_id: 'other-user', permission: 'read' },
    ];
    mockDdbSend.mockResolvedValue({ Items: shares });

    const res = await request(app).get('/api/shared').set(authHeader());
    expect(res.status).toBe(200);
    expect(res.body.shares).toHaveLength(1);
    expect(res.body.shares[0].file_name).toBe('shared.pdf');
  });
});

// ── Download shared file ───────────────────────────────────
describe('GET /api/shared/:shareId/download', () => {
  it('downloads a file shared with the user', async () => {
    mockDdbSend
      .mockResolvedValueOnce({ Item: { share_id: 's1', file_id: 'f1', owner_id: 'other-user', shared_with_user_id: 'test@securecloud.dev' } })
      .mockResolvedValueOnce({ Item: { file_id: 'f1', user_id: 'other-user', s3_key: 'other-user/f1/file.pdf', file_name: 'file.pdf' } })
      .mockResolvedValueOnce({}); // Audit

    const res = await request(app).get('/api/shared/s1/download').set(authHeader());
    expect(res.status).toBe(200);
    expect(res.body.downloadUrl).toBe('https://s3.example.com/presigned-url');
    expect(res.body.fileName).toBe('file.pdf');
  });

  it('returns 404 when share not found or not for this user', async () => {
    mockDdbSend.mockResolvedValue({ Item: { share_id: 's1', shared_with_user_id: 'other@example.com' } });
    const res = await request(app).get('/api/shared/s1/download').set(authHeader());
    expect(res.status).toBe(404);
  });

  it('returns 404 when original file no longer exists', async () => {
    mockDdbSend
      .mockResolvedValueOnce({ Item: { share_id: 's1', file_id: 'f1', owner_id: 'other-user', shared_with_user_id: 'test@securecloud.dev' } })
      .mockResolvedValueOnce({ Item: null });

    const res = await request(app).get('/api/shared/s1/download').set(authHeader());
    expect(res.status).toBe(404);
  });
});

// ── Audit logs (admin) ─────────────────────────────────────
describe('GET /api/audit', () => {
  it('returns audit logs for admin users', async () => {
    const logs = [
      { log_id: 'l1', action: 'UPLOAD', user_id: 'user-123', timestamp: '2025-01-01T00:00:00Z' },
    ];
    mockDdbSend.mockResolvedValue({ Items: logs });

    const res = await request(app).get('/api/audit').set(authHeader());
    expect(res.status).toBe(200);
    expect(res.body.logs).toHaveLength(1);
  });

  it('rejects non-admin users', async () => {
    const res = await request(app).get('/api/audit').set(authHeader('user-token'));
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Admin only');
  });
});

// ── Input validation helpers ───────────────────────────────
describe('Validation', () => {
  it('rejects file names over 255 characters', async () => {
    const longName = 'a'.repeat(256) + '.txt';
    const res = await request(app)
      .post('/api/files/upload-url')
      .set(authHeader())
      .send({ fileName: longName, fileType: 'text/plain' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid file name');
  });

  it('rejects file names with path traversal characters', async () => {
    const res = await request(app)
      .post('/api/files/upload-url')
      .set(authHeader())
      .send({ fileName: '../etc/passwd', fileType: 'text/plain' });

    expect(res.status).toBe(400);
  });
});
