FROM dolfinx/dolfinx:v0.8.0

WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install FastAPI and other dependencies system-wide (dolfinx image already has some structure)
# Dolfinx image is based on Ubuntu. Let's install pip if not present or just run pip3.
RUN apt-get update && \
    apt-get install -y python3-pip && \
    pip3 install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose FastAPI port
EXPOSE 8000

# Run FastAPI app with Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
