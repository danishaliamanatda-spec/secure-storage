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

variable "ecs_cluster_name" {
  type = string
}

variable "ecs_service_name" {
  type = string
}

variable "alb_arn_suffix" {
  type    = string
  default = ""
}

variable "files_bucket_id" {
  type = string
}

variable "files_bucket_arn" {
  type = string
}

variable "sns_topic_arn" {
  type    = string
  default = ""
}

variable "alert_email" {
  description = "Email for CloudWatch alerts"
  type        = string
  default     = ""
}

variable "tags" {
  type    = map(string)
  default = {}
}
