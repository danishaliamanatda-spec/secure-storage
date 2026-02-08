#!/bin/bash
set -euo pipefail

# ── Configuration ──────────────────────────────────────────
AWS_REGION="${AWS_REGION:-eu-west-2}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-519228350144}"
ECR_REPO="securecloud-dev-api"
FRONTEND_BUCKET="securecloud-dev-frontend-${AWS_ACCOUNT_ID}"

echo "=== SecureCloud Deployment ==="
echo "Region:  $AWS_REGION"
echo "Account: $AWS_ACCOUNT_ID"
echo ""

# ── Step 1: Build and push backend Docker image to ECR ─────
echo "── Step 1: Backend Docker image ──"
cd "$(dirname "$0")/../backend"

# Login to ECR
aws ecr get-login-password --region "$AWS_REGION" | \
  docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# Build and tag
docker build -t "$ECR_REPO" .
docker tag "$ECR_REPO:latest" "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}:latest"

# Push
docker push "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}:latest"
echo "Backend image pushed to ECR."

# ── Step 2: Force ECS service to pick up new image ─────────
echo ""
echo "── Step 2: Update ECS service ──"
aws ecs update-service \
  --cluster "securecloud-dev-cluster" \
  --service "securecloud-dev-api" \
  --force-new-deployment \
  --region "$AWS_REGION" > /dev/null
echo "ECS service update triggered."

# ── Step 3: Build and deploy frontend to S3 ────────────────
echo ""
echo "── Step 3: Frontend to S3 ──"
cd "$(dirname "$0")/../frontend"

npm run build

aws s3 sync build/ "s3://${FRONTEND_BUCKET}/" \
  --delete \
  --cache-control "max-age=86400" \
  --region "$AWS_REGION"

# Set HTML files to no-cache for instant updates
aws s3 cp "s3://${FRONTEND_BUCKET}/index.html" "s3://${FRONTEND_BUCKET}/index.html" \
  --cache-control "no-cache, no-store, must-revalidate" \
  --content-type "text/html" \
  --metadata-directive REPLACE \
  --region "$AWS_REGION"

echo "Frontend deployed to S3."

echo ""
echo "=== Deployment complete ==="
echo "Backend:  ECS will roll out the new image within ~2 minutes"
echo "Frontend: Available at the S3/CloudFront URL"
