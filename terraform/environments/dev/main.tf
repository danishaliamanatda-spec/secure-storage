################################################################################
# Terraform Configuration
################################################################################
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Uncomment for remote state (recommended for team work)
  # backend "s3" {
  #   bucket         = "secure-cloud-storage-tfstate"
  #   key            = "dev/terraform.tfstate"
  #   region         = "eu-west-2"
  #   dynamodb_table = "terraform-locks"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = local.common_tags
  }
}

################################################################################
# Local Variables
################################################################################
locals {
  project_name = "securecloud"
  environment  = "dev"

  common_tags = {
    Project     = "Secure Cloud-Based File Storage"
    Environment = local.environment
    ManagedBy   = "terraform"
    Candidate   = "0407998"
    University  = "University of Law"
  }
}

################################################################################
# Module: Networking
################################################################################
module "networking" {
  source = "../../modules/networking"

  project_name         = local.project_name
  environment          = local.environment
  vpc_cidr             = var.vpc_cidr
  public_subnet_cidrs  = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs
  availability_zones   = var.availability_zones
  enable_nat_gateway   = true
  single_nat_gateway   = true # Cost saving for dev
  enable_flow_logs     = true
  app_port             = var.app_port

  tags = local.common_tags
}

################################################################################
# Module: Security (IAM roles needed before other modules)
################################################################################
module "security" {
  source = "../../modules/security"

  project_name           = local.project_name
  environment            = local.environment
  enable_alb             = var.enable_alb
  enable_cloudfront      = var.enable_cloudfront
  alb_arn                = var.enable_alb ? module.compute.alb_arn : ""
  frontend_bucket_id     = module.storage.frontend_bucket_id
  frontend_bucket_arn    = module.storage.frontend_bucket_arn
  frontend_bucket_domain = module.storage.frontend_bucket_domain
  identity_pool_id       = module.auth.identity_pool_id

  tags = local.common_tags
}

################################################################################
# Module: Compute (ECS + ALB + ECR)
################################################################################
module "compute" {
  source = "../../modules/compute"

  project_name          = local.project_name
  environment           = local.environment
  aws_region            = var.aws_region
  vpc_id                = module.networking.vpc_id
  public_subnet_ids     = module.networking.public_subnet_ids
  private_subnet_ids    = module.networking.private_subnet_ids
  alb_security_group_id = module.networking.alb_security_group_id
  ecs_security_group_id = module.networking.ecs_security_group_id
  app_port              = var.app_port
  enable_alb            = var.enable_alb

  # Sizing for dev (minimal)
  task_cpu      = "256"
  task_memory   = "512"
  desired_count = 1
  min_capacity  = 1
  max_capacity  = 2

  # Storage references
  files_bucket_id  = module.storage.files_bucket_id
  files_bucket_arn = module.storage.files_bucket_arn
  kms_key_arn      = module.storage.kms_key_arn
  kms_key_id       = module.storage.kms_key_id

  # DynamoDB references
  metadata_table_name = module.storage.file_metadata_table_name
  audit_table_name    = module.storage.audit_logs_table_name
  shares_table_name   = module.storage.file_shares_table_name
  dynamodb_table_arns = [
    module.storage.file_metadata_table_arn,
    module.storage.audit_logs_table_arn,
    module.storage.file_shares_table_arn,
    "${module.storage.file_metadata_table_arn}/index/*",
    "${module.storage.audit_logs_table_arn}/index/*",
    "${module.storage.file_shares_table_arn}/index/*"
  ]

  # Auth references
  cognito_user_pool_id = module.auth.user_pool_id
  cognito_client_id    = module.auth.web_client_id
  acm_certificate_arn  = var.acm_certificate_arn

  tags = local.common_tags
}

################################################################################
# Module: Storage (S3 + DynamoDB + KMS)
################################################################################
module "storage" {
  source = "../../modules/storage"

  project_name      = local.project_name
  environment       = local.environment
  ecs_task_role_arn = module.compute.ecs_task_role_arn
  allowed_origins   = ["*"] # Restrict in prod

  tags = local.common_tags
}

################################################################################
# Module: Auth (Cognito)
################################################################################
module "auth" {
  source = "../../modules/auth"

  project_name = local.project_name
  environment  = local.environment

  callback_urls = ["http://localhost:3006/callback", "http://localhost:3006"]
  logout_urls   = ["http://localhost:3006"]

  admin_role_arn         = module.security.admin_role_arn
  user_role_arn          = module.security.user_role_arn
  viewer_role_arn        = module.security.viewer_role_arn
  authenticated_role_arn = module.security.authenticated_role_arn

  tags = local.common_tags
}

################################################################################
# Module: Monitoring (CloudTrail + CloudWatch)
################################################################################
module "monitoring" {
  source = "../../modules/monitoring"

  project_name     = local.project_name
  environment      = local.environment
  aws_region       = var.aws_region
  ecs_cluster_name = module.compute.ecs_cluster_name
  ecs_service_name = module.compute.ecs_service_name
  files_bucket_id  = module.storage.files_bucket_id
  files_bucket_arn = module.storage.files_bucket_arn
  alert_email      = var.alert_email

  tags = local.common_tags
}
