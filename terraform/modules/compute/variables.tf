variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "aws_region" {
  type    = string
  default = "eu-west-2"
}

variable "vpc_id" {
  type = string
}

variable "public_subnet_ids" {
  type = list(string)
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "alb_security_group_id" {
  type = string
}

variable "ecs_security_group_id" {
  type = string
}

variable "app_port" {
  type    = number
  default = 3005
}

variable "enable_alb" {
  type    = bool
  default = true
}

variable "task_cpu" {
  description = "CPU units for Fargate task"
  type        = string
  default     = "256"
}

variable "task_memory" {
  description = "Memory (MB) for Fargate task"
  type        = string
  default     = "512"
}

variable "desired_count" {
  type    = number
  default = 1
}

variable "min_capacity" {
  type    = number
  default = 1
}

variable "max_capacity" {
  type    = number
  default = 3
}

variable "files_bucket_id" {
  type = string
}

variable "files_bucket_arn" {
  type = string
}

variable "kms_key_arn" {
  type = string
}

variable "kms_key_id" {
  type = string
}

variable "metadata_table_name" {
  type = string
}

variable "audit_table_name" {
  type = string
}

variable "shares_table_name" {
  type = string
}

variable "dynamodb_table_arns" {
  type = list(string)
}

variable "cognito_user_pool_id" {
  type = string
}

variable "cognito_client_id" {
  type = string
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN for HTTPS"
  type        = string
  default     = ""
}

variable "tags" {
  type    = map(string)
  default = {}
}
