# Secure Cloud-Based File Storage System

## MSc Project in Computer Science — The University of Law

**Candidate:** 0407998  
**Supervisor:** Paul Sant  
**Date:** 2025/2026

## Overview

A secure cloud-based file storage system addressing confidentiality, integrity, and availability (CIA) using end-to-end encryption (AES-256), TLS for transmission, multi-factor authentication, role-based access control, and zero-knowledge architecture — all deployed via Terraform on AWS.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CloudFront (CDN)                       │
│                     + AWS WAF + ACM TLS                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
          ┌────────────────┴────────────────┐
          │                                 │
   ┌──────▼──────┐                  ┌───────▼───────┐
   │  S3 Bucket  │                  │  ALB (HTTPS)  │
   │  (React UI) │                  │               │
   └─────────────┘                  └───────┬───────┘
                                            │
                                    ┌───────▼───────┐
                                    │  ECS Fargate  │
                                    │  (Node.js API)│
                                    └───┬───────┬───┘
                                        │       │
                              ┌─────────▼┐  ┌───▼─────────┐
                              │ S3 Bucket│  │  DynamoDB    │
                              │ (Files)  │  │  (Metadata)  │
                              │ AES-256  │  │              │
                              │ KMS SSE  │  └──────────────┘
                              └──────────┘
                                    │
                              ┌─────▼──────┐
                              │  AWS KMS   │
                              │ (Key Mgmt) │
                              └────────────┘

Auth: AWS Cognito (MFA + User Pools + RBAC)
Monitoring: CloudTrail + CloudWatch
CI/CD: GitHub Actions → ECR → ECS
```

## Tech Stack

| Layer          | Technology                                      |
|----------------|--------------------------------------------------|
| Frontend       | React, Tailwind CSS                              |
| Backend        | Node.js, Express.js                              |
| Encryption     | AES-256 (client-side), TLS 1.3 (transit)         |
| Auth           | AWS Cognito (MFA, OAuth 2.0)                     |
| Storage        | AWS S3 (SSE-KMS), DynamoDB                       |
| Compute        | ECS Fargate (Docker)                             |
| IaC            | Terraform (modular)                              |
| CI/CD          | GitHub Actions                                   |
| Monitoring     | CloudTrail, CloudWatch, VPC Flow Logs            |
| Security       | WAF, Security Groups, IAM, KMS                   |

## Project Structure

```
secure-cloud-storage/
├── terraform/
│   ├── modules/
│   │   ├── networking/     # VPC, subnets, NAT, security groups
│   │   ├── storage/        # S3 buckets, DynamoDB, KMS
│   │   ├── compute/        # ECS Fargate, ALB, ECR
│   │   ├── auth/           # Cognito user pool, identity pool
│   │   ├── security/       # WAF, ACM, IAM policies
│   │   ├── monitoring/     # CloudTrail, CloudWatch
│   │   └── cicd/           # ECR repository, IAM for GitHub Actions
│   └── environments/
│       ├── dev/            # Development environment
│       └── prod/           # Production environment
├── frontend/               # React application
├── backend/                # Node.js API
├── docs/                   # Project documentation
├── scripts/                # Utility scripts
└── .github/workflows/      # CI/CD pipelines
```

## Quick Start

### Prerequisites
- AWS CLI configured
- Terraform >= 1.5
- Docker
- Node.js >= 18

### Deploy Infrastructure
```bash
cd terraform/environments/dev
terraform init
terraform plan
terraform apply
```

## Security Features
- **Encryption at rest:** AES-256 via AWS KMS (SSE-KMS)
- **Encryption in transit:** TLS 1.3 enforced
- **Zero-knowledge model:** Client-side encryption before upload
- **MFA:** TOTP-based via Cognito
- **RBAC:** Fine-grained IAM + Cognito groups
- **Audit:** CloudTrail + CloudWatch logging
- **Network:** VPC isolation, private subnets, WAF

## License
Academic use — The University of Law
