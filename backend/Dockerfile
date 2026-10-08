FROM node:20-alpine

# Install mysql-client so mysqldump is available for on-demand backups
RUN apk add --no-cache mysql-client

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

RUN npm install --omit=dev

# Bundle app source
COPY . .

# Ensure the backup output directory exists inside the container
RUN mkdir -p /usr/src/app/../backups/db

# Expose port 5000
EXPOSE 5000

# Start the application
CMD [ "npm", "start" ]
