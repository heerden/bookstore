
# Use the official Node.js image as the base image
FROM node:24.22.0

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./
COPY packages/api/package*.json ./packages/api/

# Install the application dependencies
RUN npm install
RUN npm i -g @nestjs/cli

# Copy the rest of the application files
COPY . .

# Build the NestJS application
RUN npm run build

# Expose the application port
EXPOSE 8080

# Command to run the application
CMD ["node", "packages/api/dist/main"]
