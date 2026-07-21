# CitiVoice Data Recovery & Protection Plan

The best approach to protecting against a total system wipeout (like a ransomware attack, hardware failure, or malicious deletion) is a **3-2-1 Backup Strategy**: keeping 3 copies of your data, across 2 different mediums, with 1 copy located **off-site**.

## 1. What You Currently Have (The Good)
You currently have a `db-backup` service running `databack/mysql-backup` in your `docker-compose.yml`. This automatically dumps your MySQL database every day at 2:00 AM (`CRON_TIME: "0 2 * * *"`) to the `./backups` folder on your server.

**The Problem:** If a hacker gains access and wipes the server, they will wipe your `./backups` folder too. Local backups only protect against accidental mistakes, not malicious attacks or server failure.

## 2. The Missing Piece: Automated Off-Site Backups
To survive a complete wipeout, your backups must immediately leave the server. 
*   **The Fix:** You should sync the `./backups` folder (and your `./backend/uploads` folder containing user photos) to a secure cloud bucket like **AWS S3, Google Cloud Storage, or Cloudflare R2**. 
*   **How:** You can set up a simple daily cron job on the host server using a tool like `rclone` or `aws-cli` to push the backup files to a cloud bucket. 

## 3. Protect Your Uploads
Your database text is being backed up, but **user photos** are not. 
If the server is wiped, the database will point to images in `./backend/uploads` that no longer exist. You need to ensure the `./backend/uploads` directory is also zipped and synced to your off-site storage.

## 4. Improve Current Security Posture
To prevent the hacker from getting in to begin with, you should tighten the setup:
*   **Remove Exposed Database Ports:** In your `docker-compose.yml`, you are mapping `3307:3306`. This means your database is accessible from the host network. If your server firewall isn't configured correctly, anyone on the internet could try to brute-force your database. Remove the `ports` mapping for the database so it only communicates internally with the backend container via the Docker network.
*   **Change Default Passwords:** The `DB_PASSWORD: root` environment variable should be changed to a strong, randomly generated string in production using an `.env` file.
*   **Don't Use the Root User:** The application should connect to MySQL using a restricted user account that only has read/write privileges to the `citivoice` database, rather than the `root` user which has absolute control over everything.

## Summary Checklist for Production:
- [ ] Set up an AWS S3 (or similar) cloud storage bucket.
- [ ] Write a bash script that zips the `./backups` and `./backend/uploads` folders.
- [ ] Use `rclone` or `aws-cli` to upload that zip to the S3 bucket every night at 3:00 AM (after the local database dump completes).
- [ ] Remove `3307:3306` from your `docker-compose.yml` to close the database off from the outside world. 
- [ ] Ensure your `.env` file uses strong, randomly generated passwords.
