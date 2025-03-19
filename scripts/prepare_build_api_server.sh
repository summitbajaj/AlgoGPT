#!/usr/bin/env bash

# 1) Clean up any old copy in server
rm -rf ./server/shared_resources

# 2) Copy the current version from the main repo
cp -r ./shared_resources ./server

# 3) Build the Docker image from inside 'server' 
cd server

# Build the image
docker buildx build \
  --platform linux/amd64 \
  -t algogptregistry.azurecr.io/algogpt-api-server:v1.0.8 \
  --push \
  -f Dockerfile \
  .

# 4) Optional: cleanup
cd ..
rm -rf ./server/shared_resources
