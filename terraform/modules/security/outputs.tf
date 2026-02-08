output "waf_acl_arn" {
  value = aws_wafv2_web_acl.main.arn
}

output "cloudfront_distribution_id" {
  value = var.enable_cloudfront ? aws_cloudfront_distribution.frontend[0].id : ""
}

output "cloudfront_domain_name" {
  value = var.enable_cloudfront ? aws_cloudfront_distribution.frontend[0].domain_name : ""
}

output "admin_role_arn" {
  value = aws_iam_role.admin.arn
}

output "user_role_arn" {
  value = aws_iam_role.user.arn
}

output "viewer_role_arn" {
  value = aws_iam_role.viewer.arn
}

output "authenticated_role_arn" {
  value = aws_iam_role.authenticated.arn
}
