#!/usr/bin/env bash

# Navigate to lsp_backend directory
cd lsp-backend

# Build the image
docker buildx build \
  --platform linux/amd64 \
  -t algogptregistry.azurecr.io/algogpt-lsp-backend:v1.0.8 \
  --push \
  -f Dockerfile \
  .

# Return to root directory
cd ..