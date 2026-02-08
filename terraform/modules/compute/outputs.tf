output "ecs_cluster_id" {
  value = aws_ecs_cluster.main.id
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  value = aws_ecs_service.backend.name
}

output "ecr_repository_url" {
  value = aws_ecr_repository.backend.repository_url
}

output "ecr_repository_name" {
  value = aws_ecr_repository.backend.name
}

output "alb_dns_name" {
  value = var.enable_alb ? aws_lb.main[0].dns_name : ""
}

output "alb_zone_id" {
  value = var.enable_alb ? aws_lb.main[0].zone_id : ""
}

output "alb_arn" {
  value = var.enable_alb ? aws_lb.main[0].arn : ""
}

output "target_group_arn" {
  value = var.enable_alb ? aws_lb_target_group.backend[0].arn : ""
}

output "ecs_task_role_arn" {
  value = aws_iam_role.ecs_task.arn
}

output "ecs_task_execution_role_arn" {
  value = aws_iam_role.ecs_task_execution.arn
}
