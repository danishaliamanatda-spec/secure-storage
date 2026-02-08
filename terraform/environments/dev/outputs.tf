################################################################################
# Outputs
################################################################################

# Networking
output "vpc_id" {
  description = "VPC ID"
  value       = module.networking.vpc_id
}

# Compute
output "alb_dns_name" {
  description = "ALB DNS name (API endpoint)"
  value       = var.enable_alb ? module.compute.alb_dns_name : "ALB disabled"
}

output "ecr_repository_url" {
  description = "ECR repository URL for Docker images"
  value       = module.compute.ecr_repository_url
}

# Storage
output "files_bucket" {
  description = "S3 bucket for encrypted files"
  value       = module.storage.files_bucket_id
}

output "frontend_bucket" {
  description = "S3 bucket for React frontend"
  value       = module.storage.frontend_bucket_id
}

# Auth
output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = module.auth.user_pool_id
}

output "cognito_client_id" {
  description = "Cognito Web Client ID"
  value       = module.auth.web_client_id
}

output "cognito_domain" {
  description = "Cognito hosted UI domain"
  value       = module.auth.user_pool_domain
}

# Security
output "cloudfront_url" {
  description = "CloudFront distribution URL (frontend)"
  value       = var.enable_cloudfront ? "https://${module.security.cloudfront_domain_name}" : "CloudFront disabled"
}

# Monitoring
output "cloudwatch_dashboard" {
  description = "CloudWatch dashboard name"
  value       = module.monitoring.dashboard_name
}
