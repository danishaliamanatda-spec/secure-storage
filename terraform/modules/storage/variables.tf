variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "ecs_task_role_arn" {
  description = "ARN of the ECS task role for KMS access"
  type        = string
}

variable "allowed_origins" {
  description = "Allowed CORS origins for S3"
  type        = list(string)
  default     = ["*"]
}

variable "tags" {
  description = "Common tags"
  type        = map(string)
  default     = {}
}
