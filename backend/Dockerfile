FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

RUN npm install --omit=dev

# Bundle app source
COPY . .

# Expose port 5000
EXPOSE 5000

# Start the application
CMD [ "npm", "start" ]
