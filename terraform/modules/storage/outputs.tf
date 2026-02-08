output "files_bucket_id" {
  description = "ID of the files S3 bucket"
  value       = aws_s3_bucket.files.id
}

output "files_bucket_arn" {
  description = "ARN of the files S3 bucket"
  value       = aws_s3_bucket.files.arn
}

output "files_bucket_domain" {
  description = "Domain name of the files bucket"
  value       = aws_s3_bucket.files.bucket_regional_domain_name
}

output "frontend_bucket_id" {
  description = "ID of the frontend S3 bucket"
  value       = aws_s3_bucket.frontend.id
}

output "frontend_bucket_arn" {
  description = "ARN of the frontend S3 bucket"
  value       = aws_s3_bucket.frontend.arn
}

output "frontend_bucket_domain" {
  description = "Domain name of the frontend bucket"
  value       = aws_s3_bucket.frontend.bucket_regional_domain_name
}

output "frontend_website_endpoint" {
  description = "Website endpoint of the frontend bucket"
  value       = aws_s3_bucket_website_configuration.frontend.website_endpoint
}

output "kms_key_arn" {
  description = "ARN of the KMS key"
  value       = aws_kms_key.storage.arn
}

output "kms_key_id" {
  description = "ID of the KMS key"
  value       = aws_kms_key.storage.key_id
}

output "file_metadata_table_name" {
  description = "DynamoDB table name for file metadata"
  value       = aws_dynamodb_table.file_metadata.name
}

output "file_metadata_table_arn" {
  description = "DynamoDB table ARN for file metadata"
  value       = aws_dynamodb_table.file_metadata.arn
}

output "audit_logs_table_name" {
  description = "DynamoDB table name for audit logs"
  value       = aws_dynamodb_table.audit_logs.name
}

output "audit_logs_table_arn" {
  description = "DynamoDB table ARN for audit logs"
  value       = aws_dynamodb_table.audit_logs.arn
}

output "file_shares_table_name" {
  description = "DynamoDB table name for file shares"
  value       = aws_dynamodb_table.file_shares.name
}

output "file_shares_table_arn" {
  description = "DynamoDB table ARN for file shares"
  value       = aws_dynamodb_table.file_shares.arn
}
