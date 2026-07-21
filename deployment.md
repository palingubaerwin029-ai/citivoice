# Deploying CitiVoice to DigitalOcean

This guide will walk you through deploying your dockerized CitiVoice application (Backend, Admin Web, and Database) to a DigitalOcean Droplet.

## Step 1: Create a Droplet
1. Log in to your DigitalOcean account.
2. Click **Create -> Droplets**.
3. Choose **Ubuntu** (the latest LTS version, e.g., 24.04 LTS).
4. Choose a plan. For this stack (MySQL, Node Backend, React Admin), a **Basic Regular Intel** droplet with at least **2GB RAM** ($12/mo) is highly recommended. (1GB RAM might struggle with building React and running MySQL simultaneously).
5. Choose your datacenter region (preferably closest to your users, e.g., Singapore).
6. Under **Authentication**, choose **SSH Key** (recommended) or create a secure root password.
7. Click **Create Droplet**.

## Step 2: Connect to your Droplet
Once your Droplet is running, copy its IPv4 address.
Open your local terminal and connect via SSH:
```bash
ssh root@YOUR_DROPLET_IP
```

## Step 3: Run the Setup Script
To make things easy, you can run the following commands on your server. This will install Docker, Docker Compose, Git, and Nginx.

```bash
# Update packages
apt-get update && apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Git & Nginx & Certbot (for SSL)
apt-get install -y git nginx certbot python3-certbot-nginx
```

## Step 4: Clone the Repository & Configure Environment
Now, get your code onto the server:
```bash
# Move to the home directory
cd ~

# Clone your repository (replace with your actual repo URL)
git clone https://github.com/palingubaerwin029-ai/my-project.git citivoice
cd citivoice

# Create the required .env files
# 1. Backend .env
nano backend/.env
```
Paste your production variables into `backend/.env` (e.g., strong passwords, production JWT secrets). **Press `Ctrl+X`, then `Y`, then `Enter` to save.**

```bash
# 2. Main .env (for Docker Compose)
nano .env
```
Paste the following:
```env
DB_ROOT_PASSWORD=your_secure_root_password
DB_NAME=citivoice
REACT_APP_API_URL=https://api.yourdomain.com/api
```
*(Note: Replace `api.yourdomain.com` with your actual domain name if you have one. If you don't have a domain yet, use `http://YOUR_DROPLET_IP:5000/api`)*

## Step 5: Secure Docker Compose (Important!)
Before starting, we need to close the public database port to prevent external attacks.
```bash
nano docker-compose.yml
```
Find the `database:` section and **delete or comment out** the `ports:` block:
```yaml
# Remove these lines:
#    ports:
#      - "3307:3306"
```
Save the file (`Ctrl+X`, `Y`, `Enter`).

## Step 6: Start the Application
Build and start your Docker containers:
```bash
docker compose up -d --build
```
*Note: This will take a few minutes as it builds the backend and admin web images.*

## Step 7: Off-Site Backup Script (For Data Safety)
To ensure data isn't lost if the droplet fails, create an automated off-site backup script.
1. Create a script to zip your local backups and uploads:
```bash
nano ~/backup_to_cloud.sh
```
2. Add this content (you will need to install and configure `rclone` or `aws-cli` later to point to your cloud bucket):
```bash
#!/bin/bash
DATE=$(date +%Y-%m-%d)
tar -czf /root/citivoice_backup_$DATE.tar.gz /root/citivoice/backups /root/citivoice/backend/uploads
# Example command to push to cloud (AWS S3)
# aws s3 cp /root/citivoice_backup_$DATE.tar.gz s3://your-bucket-name/
rm /root/citivoice_backup_$DATE.tar.gz
```
3. Make it executable and add it to cron to run daily at 3 AM:
```bash
chmod +x ~/backup_to_cloud.sh
(crontab -l 2>/dev/null; echo "0 3 * * * /root/backup_to_cloud.sh") | crontab -
```

## Step 8: Expose to the Web
Your app is now running, but to access it cleanly (without typing ports), use Nginx as a reverse proxy.

If you have domain names (e.g., `admin.yourdomain.com` and `api.yourdomain.com`), you can set up Nginx configuration blocks in `/etc/nginx/sites-available/` pointing to `localhost:8080` (Admin Web) and `localhost:5000` (Backend).

Once Nginx is set up, run:
```bash
certbot --nginx
```
This will automatically generate free SSL certificates so your application runs securely on `https://`.
