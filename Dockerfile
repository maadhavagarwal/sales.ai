FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (needed for building some python packages)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Install python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all application files
COPY . .

# Set working directory to where the app package is
WORKDIR /app/backend

# Expose port
EXPOSE 8000

# Start server using the app package
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
