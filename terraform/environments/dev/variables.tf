variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "eu-west-2"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "Public subnet CIDR blocks"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "Private subnet CIDR blocks"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.20.0/24"]
}

variable "availability_zones" {
  description = "Availability zones"
  type        = list(string)
  default     = ["eu-west-2a", "eu-west-2b"]
}

variable "app_port" {
  description = "Application port"
  type        = number
  default     = 3005
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN for HTTPS (optional for dev)"
  type        = string
  default     = ""
}

variable "enable_alb" {
  description = "Enable ALB (set false if account doesn't support it)"
  type        = bool
  default     = true
}

variable "enable_cloudfront" {
  description = "Enable CloudFront (set false if account not verified)"
  type        = bool
  default     = true
}

variable "alert_email" {
  description = "Email address for CloudWatch alerts"
  type        = string
  default     = ""
}
