variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "enable_alb" {
  type    = bool
  default = true
}

variable "enable_cloudfront" {
  type    = bool
  default = true
}

variable "alb_arn" {
  type    = string
  default = ""
}

variable "frontend_bucket_id" {
  type = string
}

variable "frontend_bucket_arn" {
  type = string
}

variable "frontend_bucket_domain" {
  type = string
}

variable "identity_pool_id" {
  type    = string
  default = ""
}

variable "tags" {
  type    = map(string)
  default = {}
}
