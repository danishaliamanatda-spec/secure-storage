variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "callback_urls" {
  description = "OAuth callback URLs"
  type        = list(string)
  default     = ["http://localhost:3006/callback"]
}

variable "logout_urls" {
  description = "OAuth logout URLs"
  type        = list(string)
  default     = ["http://localhost:3006"]
}

variable "admin_role_arn" {
  description = "IAM role ARN for admin group"
  type        = string
  default     = ""
}

variable "user_role_arn" {
  description = "IAM role ARN for user group"
  type        = string
  default     = ""
}

variable "viewer_role_arn" {
  description = "IAM role ARN for viewer group"
  type        = string
  default     = ""
}

variable "authenticated_role_arn" {
  description = "IAM role ARN for authenticated users"
  type        = string
}

variable "tags" {
  description = "Common tags"
  type        = map(string)
  default     = {}
}
