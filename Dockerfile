# --------------------------
# 1. Build Stage
# --------------------------
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files first (better caching)
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm install

# Copy source code
COPY . .

# Build TypeScript to JS
RUN npm run build


# --------------------------
# 2. Production Image
# --------------------------
FROM node:18-alpine

WORKDIR /app

# Copy only required files from builder stage
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3000

# Start the app
CMD ["node", "dist/index.js"]
