################################################################################
# CloudTrail
################################################################################
resource "aws_s3_bucket" "cloudtrail" {
  bucket        = "${var.project_name}-${var.environment}-cloudtrail-${data.aws_caller_identity.current.account_id}"
  force_destroy = var.environment == "dev" ? true : false

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-cloudtrail-logs"
  })
}

resource "aws_s3_bucket_public_access_block" "cloudtrail" {
  bucket = aws_s3_bucket.cloudtrail.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_policy" "cloudtrail" {
  bucket = aws_s3_bucket.cloudtrail.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AWSCloudTrailAclCheck"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action   = "s3:GetBucketAcl"
        Resource = aws_s3_bucket.cloudtrail.arn
      },
      {
        Sid    = "AWSCloudTrailWrite"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.cloudtrail.arn}/AWSLogs/${data.aws_caller_identity.current.account_id}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl" = "bucket-owner-full-control"
          }
        }
      }
    ]
  })
}

data "aws_caller_identity" "current" {}

resource "aws_cloudtrail" "main" {
  name                          = "${var.project_name}-${var.environment}-trail"
  s3_bucket_name                = aws_s3_bucket.cloudtrail.id
  include_global_service_events = true
  is_multi_region_trail         = false
  enable_logging                = true
  enable_log_file_validation    = true

  event_selector {
    read_write_type           = "All"
    include_management_events = true

    data_resource {
      type   = "AWS::S3::Object"
      values = ["${var.files_bucket_arn}/"]
    }
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-cloudtrail"
  })

  depends_on = [aws_s3_bucket_policy.cloudtrail]
}

################################################################################
# CloudWatch Alarms
################################################################################

# High CPU on ECS
resource "aws_cloudwatch_metric_alarm" "ecs_cpu_high" {
  alarm_name          = "${var.project_name}-${var.environment}-ecs-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "ECS CPU utilization exceeds 80%"

  dimensions = {
    ClusterName = var.ecs_cluster_name
    ServiceName = var.ecs_service_name
  }

  alarm_actions = var.sns_topic_arn != "" ? [var.sns_topic_arn] : []

  tags = var.tags
}

# High Memory on ECS
resource "aws_cloudwatch_metric_alarm" "ecs_memory_high" {
  alarm_name          = "${var.project_name}-${var.environment}-ecs-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "ECS Memory utilization exceeds 80%"

  dimensions = {
    ClusterName = var.ecs_cluster_name
    ServiceName = var.ecs_service_name
  }

  alarm_actions = var.sns_topic_arn != "" ? [var.sns_topic_arn] : []

  tags = var.tags
}

# ALB 5xx errors
resource "aws_cloudwatch_metric_alarm" "alb_5xx" {
  count               = var.alb_arn_suffix != "" ? 1 : 0
  alarm_name          = "${var.project_name}-${var.environment}-alb-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "ALB 5xx errors exceed threshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }

  alarm_actions = var.sns_topic_arn != "" ? [var.sns_topic_arn] : []

  tags = var.tags
}

# DynamoDB throttling
resource "aws_cloudwatch_metric_alarm" "dynamodb_throttle" {
  alarm_name          = "${var.project_name}-${var.environment}-dynamodb-throttle"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ThrottledRequests"
  namespace           = "AWS/DynamoDB"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "DynamoDB throttled requests detected"
  treat_missing_data  = "notBreaching"

  alarm_actions = var.sns_topic_arn != "" ? [var.sns_topic_arn] : []

  tags = var.tags
}

################################################################################
# SNS Topic for Alerts
################################################################################
resource "aws_sns_topic" "alerts" {
  name = "${var.project_name}-${var.environment}-alerts"

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-alerts"
  })
}

resource "aws_sns_topic_subscription" "email" {
  count = var.alert_email != "" ? 1 : 0

  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

################################################################################
# CloudWatch Dashboard
################################################################################
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.project_name}-${var.environment}"

  dashboard_body = jsonencode({
    widgets = concat(
      [
        {
          type   = "metric"
          x      = 0
          y      = 0
          width  = 12
          height = 6
          properties = {
            title   = "ECS CPU & Memory"
            metrics = [
              ["AWS/ECS", "CPUUtilization", "ClusterName", var.ecs_cluster_name, "ServiceName", var.ecs_service_name],
              ["AWS/ECS", "MemoryUtilization", "ClusterName", var.ecs_cluster_name, "ServiceName", var.ecs_service_name]
            ]
            period = 300
            region = var.aws_region
          }
        }
      ],
      var.alb_arn_suffix != "" ? [
        {
          type   = "metric"
          x      = 12
          y      = 0
          width  = 12
          height = 6
          properties = {
            title   = "ALB Request Count & Errors"
            metrics = [
              ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", var.alb_arn_suffix],
              ["AWS/ApplicationELB", "HTTPCode_Target_5XX_Count", "LoadBalancer", var.alb_arn_suffix],
              ["AWS/ApplicationELB", "HTTPCode_Target_4XX_Count", "LoadBalancer", var.alb_arn_suffix]
            ]
            period = 300
            region = var.aws_region
          }
        }
      ] : [],
      [
        {
          type   = "metric"
          x      = 0
          y      = 6
          width  = 12
          height = 6
          properties = {
            title   = "S3 Operations"
            metrics = [
              ["AWS/S3", "NumberOfObjects", "BucketName", var.files_bucket_id, "StorageType", "AllStorageTypes"],
              ["AWS/S3", "BucketSizeBytes", "BucketName", var.files_bucket_id, "StorageType", "StandardStorage"]
            ]
            period = 86400
            region = var.aws_region
          }
        },
        {
          type   = "metric"
          x      = 12
          y      = 6
          width  = 12
          height = 6
          properties = {
            title   = "WAF Blocked Requests"
            metrics = [
              ["AWS/WAFV2", "BlockedRequests", "WebACL", "${var.project_name}-${var.environment}-waf", "Region", var.aws_region, "Rule", "ALL"]
            ]
            period = 300
            region = var.aws_region
          }
        }
      ]
    )
  })
}
