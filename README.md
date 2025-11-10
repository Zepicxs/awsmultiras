# Digital Archive System

A simple web application for uploading and managing digital archives using AWS services (S3, DynamoDB, EC2) with Nginx as webserver and Node.js backend.

## Features

- Upload files to AWS S3
- Store file metadata in DynamoDB
- List all archived files
- Simple web interface

## Prerequisites

- Node.js (v14 or higher)
- Nginx webserver
- AWS Account with appropriate permissions
- AWS CLI (optional, for easier setup)

## AWS Setup

### 1. Create an S3 Bucket

1. Go to the AWS S3 console
2. Click "Create bucket"
3. Enter a unique bucket name (e.g., `your-digital-archive-bucket`)
4. Choose your preferred region
5. Keep default settings and create the bucket

### 2. Create a DynamoDB Table

1. Go to the AWS DynamoDB console
2. Click "Create table"
3. Table name: `digital-archive-metadata` (or your preferred name)
4. Partition key: `id` (String)
5. Keep default settings and create the table

### 3. Create IAM User/Role

For local development:
1. Go to IAM console
2. Create a new user or use existing one
3. Attach the following policies:
   - `AmazonS3FullAccess`
   - `AmazonDynamoDBFullAccess`
4. Generate access keys

For EC2 deployment, use IAM roles instead of access keys.

## Local Setup

1. Clone or download this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Install and configure Nginx (see Nginx Setup below)
4. Copy `.env` file and fill in your AWS credentials:
   ```
   AWS_ACCESS_KEY_ID=your_access_key
   AWS_SECRET_ACCESS_KEY=your_secret_key
   AWS_REGION=us-east-1
   S3_BUCKET_NAME=your-s3-bucket-name
   DYNAMODB_TABLE_NAME=your-dynamodb-table-name
   ```
5. Start the Node.js backend:
   ```
   npm start
   ```
6. Start Nginx webserver
7. Open your browser and go to `http://localhost`

## Nginx Setup

### Windows
1. Download Nginx for Windows from https://nginx.org/en/download.html
2. Extract to a folder (e.g., C:\nginx)
3. Copy the `nginx.conf` file from this project to C:\nginx\conf\nginx.conf
4. Edit the `root` directive in nginx.conf to point to the absolute path of your 'public' folder
5. Adjust log paths if needed
6. Start Nginx: `C:\nginx\nginx.exe`

### Linux/Ubuntu
1. Install Nginx: `sudo apt update && sudo apt install nginx`
2. Copy the `nginx.conf` file to `/etc/nginx/sites-available/digital-archive`
3. Edit the `root` directive to point to the absolute path of your 'public' folder
4. Create symlink: `sudo ln -s /etc/nginx/sites-available/digital-archive /etc/nginx/sites-enabled/`
5. Test config: `sudo nginx -t`
6. Reload Nginx: `sudo systemctl reload nginx`

## Deployment to EC2

### 1. Launch EC2 Instance

1. Go to EC2 console
2. Launch instance with Amazon Linux 2 or Ubuntu
3. Configure security group to allow HTTP (port 80) and SSH (port 22)
4. Attach IAM role with S3 and DynamoDB permissions

### 2. Install Node.js on EC2

For Amazon Linux:
```
sudo yum update -y
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install node
```

For Ubuntu:
```
sudo apt update
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 3. Deploy Application

1. Upload your project files to EC2 (using scp, git, etc.)
2. SSH into your EC2 instance
3. Navigate to project directory
4. Install dependencies: `npm install`
5. Set environment variables (use IAM role instead of access keys):
   ```
   export S3_BUCKET_NAME=your-s3-bucket-name
   export DYNAMODB_TABLE_NAME=your-dynamodb-table-name
   export AWS_REGION=us-east-1
   export PORT=80
   ```
6. Start the application: `npm start`

### 4. Configure for Production

- Use PM2 for process management: `npm install -g pm2 && pm2 start server.js --name "archive-app"`
- Nginx is already configured as reverse proxy
- Configure SSL certificate with Let's Encrypt

## Usage

1. Open the web application in your browser
2. Use the upload form to select and upload files
3. Click "Load Archives" to view all uploaded files
4. Files are stored securely in S3, metadata in DynamoDB

## Security Notes

- Never commit `.env` file with real credentials to version control
- Use IAM roles on EC2 instead of access keys
- Configure S3 bucket policies for least privilege access
- Consider adding authentication for production use

## API Endpoints

- `POST /upload`: Upload a file
- `GET /archives`: Retrieve list of all archives

## Architecture

- **Nginx**: Serves static files (HTML, CSS, JS) and acts as reverse proxy for API requests
- **Node.js/Express**: Handles API endpoints, file uploads, and AWS interactions
- **AWS S3**: File storage
- **AWS DynamoDB**: Metadata storage

## Technologies Used

- Node.js
- Express.js
- Nginx
- AWS SDK
- Multer (file uploads)
- HTML/CSS/JavaScript (frontend)
