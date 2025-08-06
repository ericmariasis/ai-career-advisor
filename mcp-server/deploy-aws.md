# AWS Deployment Guide for MCP Server

## Prerequisites for AWS Deployment

### 1. Ensure Git LFS Files are Available

Before building Docker images for AWS deployment, make sure `jobs_seed.json` is properly downloaded:

```bash
# One-time setup (if not already done)
git lfs install

# Pull LFS files before building
git lfs pull

# Verify the file is the full 63MB version, not a pointer
ls -lh mcp-server/jobs_seed.json
# Should show ~63MB, not ~130 bytes
```

### 2. Docker Build for AWS

The Dockerfile is optimized for AWS deployment with:
- Multi-stage build for smaller final image
- Production-only dependencies in runtime
- Health checks for ECS/EKS
- Proper layer caching

```bash
# Build the images
cd mcp-server
docker-compose build

# Test locally before deploying
docker-compose up -d
docker-compose logs server
```

## AWS Deployment Options

### Option 1: AWS ECS with ECR

1. **Push to ECR:**
```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Tag and push images
docker tag mcp-server-server:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/mcp-server:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/mcp-server:latest

docker tag mcp-server-web:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/mcp-web:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/mcp-web:latest
```

2. **ECS Task Definition** (example):
```json
{
  "family": "mcp-server",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "mcp-server",
      "image": "<account-id>.dkr.ecr.us-east-1.amazonaws.com/mcp-server:latest",
      "portMappings": [{"containerPort": 4000}],
      "healthCheck": {
        "command": ["CMD-SHELL", "node -e \"require('http').get('http://localhost:4000/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))\""],
        "interval": 30,
        "timeout": 3,
        "retries": 3,
        "startPeriod": 5
      },
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "REDIS_URL", "value": "redis://redis-cluster.xxx.cache.amazonaws.com:6379"}
      ]
    }
  ]
}
```

### Option 2: AWS EKS

1. **Create Kubernetes manifests:**
```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mcp-server
spec:
  replicas: 2
  selector:
    matchLabels:
      app: mcp-server
  template:
    metadata:
      labels:
        app: mcp-server
    spec:
      containers:
      - name: mcp-server
        image: <account-id>.dkr.ecr.us-east-1.amazonaws.com/mcp-server:latest
        ports:
        - containerPort: 4000
        env:
        - name: NODE_ENV
          value: "production"
        - name: REDIS_URL
          value: "redis://elasticache-redis.xxx.amazonaws.com:6379"
        livenessProbe:
          httpGet:
            path: /health
            port: 4000
          initialDelaySeconds: 30
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 4000
          initialDelaySeconds: 5
          periodSeconds: 10
```

### Option 3: EC2 with Docker Compose

1. **Setup EC2 instance:**
```bash
# Install Docker and Docker Compose
sudo yum update -y
sudo yum install -y docker
sudo service docker start
sudo usermod -a -G docker ec2-user

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

2. **Deploy application:**
```bash
# Clone repo with LFS
git clone <your-repo>
cd ai-career-advisor/mcp-server
git lfs install
git lfs pull

# Deploy
docker-compose up -d

# Setup systemd service for auto-restart
sudo systemctl enable docker
```

## AWS Services Integration

### Redis (ElastiCache)
```bash
# Create ElastiCache Redis cluster
aws elasticache create-cache-cluster \
    --cache-cluster-id mcp-redis \
    --cache-node-type cache.t3.micro \
    --engine redis \
    --num-cache-nodes 1
```

### Load Balancer (ALB)
```bash
# Create Application Load Balancer
aws elbv2 create-load-balancer \
    --name mcp-alb \
    --subnets subnet-xxx subnet-yyy \
    --security-groups sg-xxx
```

## Important Notes for AWS

1. **Git LFS Files:** Always run `git lfs pull` before building images
2. **Health Checks:** The Dockerfile includes health checks for ECS/EKS
3. **Environment Variables:** Set `REDIS_URL` to point to ElastiCache
4. **Security Groups:** Open ports 80, 443 (ALB) and 4000, 3000 (containers)
5. **Persistent Storage:** Redis data should use ElastiCache, not local volumes

## Troubleshooting

### If jobs_seed.json is missing or small:
```bash
# Check file size
ls -lh mcp-server/jobs_seed.json

# If it's ~130 bytes (LFS pointer), pull the actual file:
git lfs pull

# Rebuild the image
docker-compose build server
```

### If container fails to start:
```bash
# Check logs
docker-compose logs server

# Common issues:
# 1. Redis connection - check REDIS_URL
# 2. jobs_seed.json missing - check file was copied
# 3. Port conflicts - ensure ports are available
```
