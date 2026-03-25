
# ============================================
# Node.js/Express Backend Dockerfile for Render
# ============================================
FROM node:20

WORKDIR /app

# Install build dependencies for better-sqlite3
RUN apt-get update && apt-get install -y python3 make g++

# Copy package files
COPY package.json ./
# If package-lock.json exists, copy it. Otherwise skip.
COPY package-lock.json* ./

# Install dependencies
RUN npm install

# Copy application source
COPY . .

# Generate Prisma Client
# Note: DATABASE_URL doesn't need to be real for generation
RUN npx prisma generate

# Create uploads directory
RUN mkdir -p uploads

# Set environment to production
ENV NODE_ENV=production

# Expose backend port
EXPOSE 5000

# Start the application
CMD ["node", "index.js"]
