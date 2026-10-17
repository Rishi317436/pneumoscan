FROM python:3.11-slim

# Install Node.js 20 and system dependencies for OpenCV and image processing
RUN apt-get update && apt-get install -y \
    curl \
    libgl1 \
    libglib2.0-0 \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 1. Install Python ML and DIP engine dependencies
COPY dip_engine/requirements.txt ./dip_engine/
RUN pip install --no-cache-dir -r dip_engine/requirements.txt

# 2. Install backend Node.js dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm install --production

# 3. Build React Frontend for Production
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# 4. Copy backend and DIP engine source files
COPY backend/ ./backend/
COPY dip_engine/ ./dip_engine/

# Ensure image storage directories exist
RUN mkdir -p backend/uploads backend/gradcam dip_engine/results

ENV PORT=5000
ENV NODE_ENV=production
ENV PYTHON_PATH=python3

EXPOSE 5000

WORKDIR /app/backend
CMD ["node", "server.js"]
