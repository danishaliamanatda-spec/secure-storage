# Secure Cloud-Based File Storage System

## MSc Project in Computer Science — The University of Law

**Candidate:** 0407998
**Supervisor:** Paul Sant
**Date:** 2025/2026

---

## Overview

A secure cloud-based file storage system addressing confidentiality, integrity, and availability (CIA) using end-to-end encryption (AES-256), TLS for transmission, multi-factor authentication, role-based access control, and zero-knowledge architecture — all deployed via Terraform on AWS.

---

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

---

## Tech Stack

| Layer          | Technology                                       |
|----------------|--------------------------------------------------|
| Frontend       | React 18, Tailwind CSS                           |
| Backend        | Node.js 18+, Express.js 4                        |
| Encryption     | AES-256 (client-side), TLS 1.3 (transit)         |
| Auth           | AWS Cognito (MFA, OAuth 2.0)                     |
| Storage        | AWS S3 (SSE-KMS), DynamoDB                       |
| Compute        | ECS Fargate (Docker)                             |
| IaC            | Terraform (modular)                              |
| CI/CD          | GitHub Actions                                   |
| Monitoring     | CloudTrail, CloudWatch, VPC Flow Logs            |
| Security       | WAF, Security Groups, IAM, KMS                   |

---

## Project Structure

```
secure-cloud-storage/
├── frontend/                   # React application (port 3006)
│   ├── src/
│   │   ├── App.js              # Main application (login, signup, dashboard)
│   │   ├── config.js           # Environment configuration
│   │   └── index.js            # React entry point
│   ├── public/                 # Static assets
│   ├── Dockerfile              # Frontend container
│   ├── package.json            # React dependencies
│   └── .env                    # Frontend environment variables (git-ignored)
│
├── backend/                    # Node.js Express API (port 3005)
│   ├── src/
│   │   ├── server.js           # Express API with all endpoints
│   │   └── server.test.js      # Jest unit tests (30 tests)
│   ├── Dockerfile              # Multi-stage production build
│   ├── package.json            # Backend dependencies
│   └── .env                    # Backend environment variables (git-ignored)
│
├── terraform/                  # Infrastructure as Code
│   ├── modules/
│   │   ├── networking/         # VPC, subnets, NAT, security groups
│   │   ├── storage/            # S3 buckets, DynamoDB tables, KMS
│   │   ├── compute/            # ECS Fargate, ALB, ECR
│   │   ├── auth/               # Cognito user pool, identity pool, MFA
│   │   ├── security/           # WAF, ACM, IAM policies
│   │   ├── monitoring/         # CloudTrail, CloudWatch, SNS alerts
│   │   └── cicd/               # ECR repository, IAM for GitHub Actions
│   └── environments/
│       ├── dev/                # Development environment config
│       └── prod/               # Production environment config
│
├── scripts/
│   └── deploy.sh               # Manual deployment script (ECR + ECS + S3)
│
├── .github/workflows/
│   └── ci-cd.yml               # GitHub Actions CI/CD pipeline
│
├── docker-compose.yml          # Local development with Docker
└── .gitignore
```

---

## Prerequisites — What to Install on a New Laptop

Before cloning and running this project, install the following tools:

### 1. Git

Download and install Git to clone the repository.

- **Windows:** Download from https://git-scm.com/download/win
- **macOS:** `brew install git` (or install Xcode Command Line Tools)
- **Linux (Ubuntu/Debian):** `sudo apt update && sudo apt install git`

Verify installation:
```bash
git --version
# Expected output: git version 2.x.x
```

### 2. Node.js (version 18 or higher)

The backend and frontend both require Node.js. **Node.js 18 LTS or 20 LTS recommended.**

- **All platforms:** Download from https://nodejs.org/ (choose LTS version)
- **macOS (Homebrew):** `brew install node@20`
- **Linux (Ubuntu/Debian):**
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt install -y nodejs
  ```
- **Windows (alternative):** Use `winget install OpenJS.NodeJS.LTS`

Verify installation:
```bash
node --version
# Expected output: v18.x.x or v20.x.x

npm --version
# Expected output: 10.x.x
```

### 3. Docker Desktop

Docker is required to run the application using `docker-compose`.

- **Windows:** Download from https://www.docker.com/products/docker-desktop/ (requires WSL2)
- **macOS:** Download from https://www.docker.com/products/docker-desktop/
- **Linux (Ubuntu):**
  ```bash
  sudo apt update
  sudo apt install docker.io docker-compose-plugin
  sudo usermod -aG docker $USER
  # Log out and back in for group changes to take effect
  ```

Verify installation:
```bash
docker --version
# Expected output: Docker version 2x.x.x

docker compose version
# Expected output: Docker Compose version v2.x.x
```

> **Important (Windows):** Make sure Docker Desktop is **running** before proceeding. You should see the Docker whale icon in the system tray.

### 4. AWS CLI (Optional — only for AWS deployment)

Only needed if you plan to deploy infrastructure to AWS or run Terraform.

- **All platforms:** https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html
- **Windows:** `winget install Amazon.AWSCLI`
- **macOS:** `brew install awscli`
- **Linux:** `sudo apt install awscli`

```bash
aws --version
# Expected output: aws-cli/2.x.x

# Configure credentials:
aws configure
# Enter: AWS Access Key ID, Secret Access Key, Region (eu-west-2), Output format (json)
```

### 5. Terraform (Optional — only for infrastructure deployment)

Only needed if deploying AWS infrastructure.

- **All platforms:** https://developer.hashicorp.com/terraform/downloads
- **Windows:** `winget install Hashicorp.Terraform`
- **macOS:** `brew install terraform`
- **Linux:**
  ```bash
  sudo apt install -y gnupg software-properties-common
  wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
  echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
  sudo apt update && sudo apt install terraform
  ```

```bash
terraform --version
# Expected output: Terraform v1.5.x+
```

### Summary of Required Tools

| Tool             | Required? | Version   | Purpose                                |
|------------------|-----------|-----------|----------------------------------------|
| Git              | Yes       | 2.x+      | Clone the repository                   |
| Node.js          | Yes       | 18+ (20 recommended) | Run frontend & backend locally  |
| npm              | Yes       | 10+       | Install JavaScript dependencies        |
| Docker Desktop   | Yes       | 24+       | Run containers with docker-compose     |
| AWS CLI          | Optional  | 2.x+      | Deploy to AWS, manage credentials      |
| Terraform        | Optional  | 1.5+      | Provision AWS infrastructure           |
| Code Editor      | Optional  | Any       | VS Code recommended                   |

---

## Getting Started — Clone and Run

### Step 1: Clone the Repository

```bash
git clone <your-repository-url>
cd secure-cloud-storage
```

### Step 2: Set Up Environment Variables

The project uses `.env` files for configuration. Example files are provided.

**Backend** — create `backend/.env`:
```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your AWS values:
```env
PORT=3005
NODE_ENV=development
AWS_REGION=eu-west-2
S3_BUCKET=your-s3-bucket-name
DYNAMODB_TABLE_METADATA=your-file-metadata-table
DYNAMODB_TABLE_AUDIT=your-audit-logs-table
DYNAMODB_TABLE_SHARES=your-file-shares-table
COGNITO_USER_POOL_ID=eu-west-2_XXXXXXXXX
COGNITO_CLIENT_ID=your-cognito-client-id
KMS_KEY_ID=your-kms-key-id
```

**Frontend** — create `frontend/.env`:
```bash
cp frontend/.env.example frontend/.env
```

Edit `frontend/.env`:
```env
REACT_APP_AWS_REGION=eu-west-2
REACT_APP_API_URL=http://localhost:3005
REACT_APP_COGNITO_USER_POOL_ID=eu-west-2_XXXXXXXXX
REACT_APP_COGNITO_CLIENT_ID=your-cognito-client-id
```

> **Note:** The Cognito User Pool ID and Client ID must match real AWS Cognito resources. These are created by the Terraform infrastructure (see "Deploy Infrastructure" section below).

### Step 3: Run with Docker Compose (Recommended)

This is the easiest way to run the full application.

```bash
# Make sure Docker Desktop is running, then:
docker compose up --build
```

Wait for the build to complete (first build may take 3-5 minutes). You will see:
```
backend-1   | info: Server running on port 3005
frontend-1  | Compiled successfully!
frontend-1  | You can now view secure-cloud-storage-frontend in the browser.
frontend-1  |   Local: http://localhost:3006
```

**Access the application:**
- **Frontend (UI):** http://localhost:3006
- **Backend (API):** http://localhost:3005
- **Health Check:** http://localhost:3005/health

**To stop the application:**
```bash
# Press Ctrl+C in the terminal, then:
docker compose down
```

### Step 4 (Alternative): Run Without Docker

If you prefer running without Docker:

**Terminal 1 — Backend:**
```bash
cd backend
npm install
npm run dev
```
The backend starts on http://localhost:3005.

**Terminal 2 — Frontend:**
```bash
cd frontend
npm install
npm start
```
The frontend starts on http://localhost:3006.

---

## Using the Application

### 1. Create an Account
- Open http://localhost:3006 in your browser
- Click **"Create Account"**
- Enter your name, email, and a password (minimum 12 characters, must include uppercase, lowercase, number, and symbol)
- Check your email for a verification code and enter it

### 2. Set Up MFA
- After first sign-in, you will be prompted to set up TOTP-based MFA
- Open an authenticator app (Google Authenticator, Authy, or Microsoft Authenticator)
- Scan the QR code or manually enter the secret key
- Enter the 6-digit code to verify

### 3. Dashboard Features
- **My Files** — Upload, download, delete, and search files
- **Shared** — View files shared with you by other users
- **Audit Logs** — View activity logs (admin users only)

### 4. Upload Files
- Drag and drop files onto the upload zone, or click "Choose File"
- Files are uploaded via presigned S3 URLs
- All files are encrypted at rest with AES-256 via AWS KMS

### 5. Share Files
- Click the share icon on any file
- Enter the recipient's email address
- Choose permission level: **Read Only** or **Read & Write**

---

## API Endpoints

The backend exposes the following REST API endpoints:

| Method | Endpoint                          | Auth | Description                    |
|--------|-----------------------------------|------|--------------------------------|
| GET    | `/health`                         | No   | Health check                   |
| POST   | `/api/files/upload-url`           | Yes  | Get presigned upload URL       |
| GET    | `/api/files`                      | Yes  | List user's files              |
| GET    | `/api/files/:fileId/download`     | Yes  | Get presigned download URL     |
| DELETE | `/api/files/:fileId`              | Yes  | Delete a file                  |
| POST   | `/api/files/:fileId/share`        | Yes  | Share a file with another user |
| GET    | `/api/shared`                     | Yes  | List files shared with me      |
| GET    | `/api/shared/:shareId/download`   | Yes  | Download a shared file         |
| GET    | `/api/audit`                      | Yes  | Get audit logs (admin only)    |

**Authentication:** All `/api/*` endpoints require a valid JWT token in the `Authorization: Bearer <token>` header. Tokens are obtained from AWS Cognito after login.

**Rate Limiting:** 100 requests per 15 minutes per IP on all `/api/*` routes.

---

## Running Tests

### Backend Unit Tests
```bash
cd backend
npm install      # if not already installed
npm test         # runs Jest with coverage report
```

Expected output:
```
Test Suites: 1 passed, 1 total
Tests:       30 passed, 30 total
Coverage:    Statements, Branches, Functions, Lines
```

### Linting
```bash
cd backend
npm run lint
```

---

## Deploy Infrastructure to AWS (Terraform)

> **Prerequisite:** AWS CLI must be configured with valid credentials and Terraform must be installed.

### Step 1: Initialize Terraform
```bash
cd terraform/environments/dev
terraform init
```

### Step 2: Review the Plan
```bash
terraform plan
```

This shows all AWS resources that will be created:
- VPC with public/private subnets
- S3 buckets (files + frontend hosting)
- DynamoDB tables (metadata, audit logs, file shares)
- KMS encryption key
- Cognito User Pool with MFA
- ECS Fargate cluster and service
- Application Load Balancer
- WAF rules
- CloudTrail and CloudWatch monitoring
- IAM roles and policies

### Step 3: Apply
```bash
terraform apply
```

Type `yes` to confirm. Infrastructure provisioning takes approximately 10-15 minutes.

### Step 4: Update Environment Variables
After Terraform completes, update your `.env` files with the output values:
- Cognito User Pool ID
- Cognito Client ID
- S3 Bucket names
- DynamoDB table names
- KMS Key ID

---

## Deploy Application to AWS

### Option A: Manual Deployment Script
```bash
# Set your AWS account ID:
export AWS_ACCOUNT_ID=your-account-id
export AWS_REGION=eu-west-2

# Run the deploy script:
./scripts/deploy.sh
```

This script:
1. Builds and pushes the backend Docker image to ECR
2. Triggers an ECS service update (rolling deployment)
3. Builds the frontend and syncs to S3
4. Invalidates CloudFront cache

### Option B: CI/CD (GitHub Actions)
Push to the `main` branch to trigger automatic deployment:
1. Terraform validation and plan
2. Backend: test, lint, build Docker image, push to ECR, deploy to ECS
3. Frontend: build, deploy to S3, invalidate CloudFront

Required GitHub Secrets:
| Secret                  | Description                              |
|-------------------------|------------------------------------------|
| `AWS_ROLE_ARN`          | IAM role ARN for GitHub Actions OIDC     |
| `API_URL`               | Backend API URL (ALB/CloudFront URL)     |
| `COGNITO_USER_POOL_ID`  | Cognito User Pool ID                     |
| `COGNITO_CLIENT_ID`     | Cognito App Client ID                    |
| `FRONTEND_BUCKET`       | S3 bucket name for frontend hosting      |
| `CLOUDFRONT_DIST_ID`    | CloudFront distribution ID               |

---

## Security Features

| Feature                    | Implementation                                |
|----------------------------|-----------------------------------------------|
| Encryption at rest         | AES-256 via AWS KMS (SSE-KMS) on S3           |
| Encryption in transit      | TLS 1.3 enforced on all connections           |
| Authentication             | AWS Cognito with email-based sign-up          |
| Multi-Factor Auth (MFA)    | TOTP via authenticator app (required)         |
| Role-Based Access Control  | Cognito groups: admin, user, viewer           |
| Input Validation           | Server-side file name and email validation    |
| Rate Limiting              | 100 requests per 15 min per IP                |
| Security Headers           | Helmet.js middleware                          |
| Audit Logging              | All operations logged to DynamoDB + CloudTrail|
| Network Security           | VPC isolation, private subnets, WAF           |
| Container Security         | Non-root user in Docker, multi-stage build    |

---

## Troubleshooting

### Docker Issues

**"Cannot connect to the Docker daemon"**
- Make sure Docker Desktop is running
- On Windows, check that WSL2 is enabled
- On Linux, run: `sudo systemctl start docker`

**Build is very slow**
- First build downloads base images and installs all dependencies (~3-5 min)
- Subsequent builds use Docker cache and are much faster
- Ensure Docker has at least 4GB of RAM allocated (Docker Desktop > Settings > Resources)

### Frontend Issues

**"Compiled with warnings" or blank page**
- Check that `frontend/.env` has correct values
- Ensure `REACT_APP_API_URL` points to `http://localhost:3005` for local development
- Clear browser cache and reload

**CORS errors in browser console**
- Ensure the backend is running on port 3005
- The backend allows all origins in development mode

### Backend Issues

**"Server running on port 3005" but API calls fail**
- Check that `backend/.env` has valid AWS credentials
- Ensure AWS resources (S3, DynamoDB, Cognito) exist
- Check Docker logs: `docker compose logs backend`

**"Invalid or expired token"**
- Sign out and sign in again to get a fresh JWT
- Ensure Cognito User Pool ID in backend `.env` matches frontend `.env`

### AWS / Terraform Issues

**"Access Denied" errors**
- Verify AWS CLI credentials: `aws sts get-caller-identity`
- Ensure IAM user/role has sufficient permissions
- Check that AWS_REGION is set to `eu-west-2`

**Terraform state issues**
- Never delete `.tfstate` files manually
- Use `terraform refresh` to sync state with actual resources

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable                   | Required | Description                              | Example                              |
|----------------------------|----------|------------------------------------------|--------------------------------------|
| `PORT`                     | No       | Server port (default: 3005)              | `3005`                               |
| `NODE_ENV`                 | No       | Environment mode                         | `development`                        |
| `AWS_REGION`               | Yes      | AWS region                               | `eu-west-2`                          |
| `S3_BUCKET`                | Yes      | S3 bucket for file storage               | `securecloud-dev-files-123456`       |
| `DYNAMODB_TABLE_METADATA`  | Yes      | DynamoDB table for file metadata         | `securecloud-dev-file-metadata`      |
| `DYNAMODB_TABLE_AUDIT`     | Yes      | DynamoDB table for audit logs            | `securecloud-dev-audit-logs`         |
| `DYNAMODB_TABLE_SHARES`    | Yes      | DynamoDB table for file shares           | `securecloud-dev-file-shares`        |
| `COGNITO_USER_POOL_ID`     | Yes      | Cognito User Pool ID                     | `eu-west-2_XXXXXXXXX`               |
| `COGNITO_CLIENT_ID`        | Yes      | Cognito App Client ID                    | `4757ec0jpnnl7sc59p5r7u3vjs`         |
| `KMS_KEY_ID`               | Yes      | KMS key for encryption                   | `8f57cd6d-a9eb-4203-8ab3-...`        |

### Frontend (`frontend/.env`)

| Variable                          | Required | Description                     | Example                          |
|-----------------------------------|----------|---------------------------------|----------------------------------|
| `REACT_APP_AWS_REGION`            | Yes      | AWS region                      | `eu-west-2`                      |
| `REACT_APP_API_URL`               | Yes      | Backend API base URL            | `http://localhost:3005`          |
| `REACT_APP_COGNITO_USER_POOL_ID`  | Yes      | Cognito User Pool ID            | `eu-west-2_XXXXXXXXX`           |
| `REACT_APP_COGNITO_CLIENT_ID`     | Yes      | Cognito App Client ID           | `4757ec0jpnnl7sc59p5r7u3vjs`     |

---

## License

Academic use — The University of Law
