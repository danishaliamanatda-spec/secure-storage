################################################################################
# KMS Key for Encryption
################################################################################
resource "aws_kms_key" "storage" {
  description             = "KMS key for encrypting stored files"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EnableRootAccount"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "AllowECSTaskRole"
        Effect = "Allow"
        Principal = {
          AWS = var.ecs_task_role_arn
        }
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey",
          "kms:GenerateDataKeyWithoutPlaintext",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
  })

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-storage-kms"
  })
}

resource "aws_kms_alias" "storage" {
  name          = "alias/${var.project_name}-${var.environment}-storage"
  target_key_id = aws_kms_key.storage.key_id
}

data "aws_caller_identity" "current" {}

################################################################################
# S3 Bucket - File Storage (Encrypted)
################################################################################
resource "aws_s3_bucket" "files" {
  bucket        = "${var.project_name}-${var.environment}-files-${data.aws_caller_identity.current.account_id}"
  force_destroy = var.environment == "dev" ? true : false

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-files"
  })
}

resource "aws_s3_bucket_versioning" "files" {
  bucket = aws_s3_bucket.files.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "files" {
  bucket = aws_s3_bucket.files.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.storage.arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "files" {
  bucket = aws_s3_bucket.files.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "files" {
  bucket = aws_s3_bucket.files.id

  rule {
    id     = "transition-to-ia"
    status = "Enabled"

    filter {}

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}

resource "aws_s3_bucket_cors_configuration" "files" {
  bucket = aws_s3_bucket.files.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = var.allowed_origins
    expose_headers  = ["ETag", "x-amz-meta-custom-header"]
    max_age_seconds = 3600
  }
}

# Enforce TLS-only access
resource "aws_s3_bucket_policy" "files_tls" {
  bucket = aws_s3_bucket.files.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "EnforceTLS"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.files.arn,
          "${aws_s3_bucket.files.arn}/*"
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      }
    ]
  })
}

################################################################################
# S3 Bucket - Frontend Hosting
################################################################################
resource "aws_s3_bucket" "frontend" {
  bucket        = "${var.project_name}-${var.environment}-frontend-${data.aws_caller_identity.current.account_id}"
  force_destroy = var.environment == "dev" ? true : false

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-frontend"
  })
}

resource "aws_s3_bucket_website_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

################################################################################
# DynamoDB - File Metadata & Audit Logs
################################################################################
resource "aws_dynamodb_table" "file_metadata" {
  name         = "${var.project_name}-${var.environment}-file-metadata"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "file_id"
  range_key    = "user_id"

  attribute {
    name = "file_id"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "S"
  }

  global_secondary_index {
    name            = "user-files-index"
    hash_key        = "user_id"
    range_key       = "created_at"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.storage.arn
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-file-metadata"
  })
}

resource "aws_dynamodb_table" "audit_logs" {
  name         = "${var.project_name}-${var.environment}-audit-logs"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "log_id"
  range_key    = "timestamp"

  attribute {
    name = "log_id"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  global_secondary_index {
    name            = "user-audit-index"
    hash_key        = "user_id"
    range_key       = "timestamp"
    projection_type = "ALL"
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.storage.arn
  }

  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-audit-logs"
  })
}

################################################################################
# DynamoDB - File Sharing / Permissions
################################################################################
resource "aws_dynamodb_table" "file_shares" {
  name         = "${var.project_name}-${var.environment}-file-shares"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "share_id"

  attribute {
    name = "share_id"
    type = "S"
  }

  attribute {
    name = "file_id"
    type = "S"
  }

  attribute {
    name = "shared_with_user_id"
    type = "S"
  }

  global_secondary_index {
    name            = "file-shares-index"
    hash_key        = "file_id"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "user-shared-files-index"
    hash_key        = "shared_with_user_id"
    projection_type = "ALL"
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.storage.arn
  }

  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-file-shares"
  })
}
