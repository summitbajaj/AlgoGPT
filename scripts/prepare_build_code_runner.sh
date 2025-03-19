#!/usr/bin/env bash

# 1) Clean up any old copy in code-runner
rm -rf ./code-runner/shared_resources

# 2) Copy the current version from the main repo
cp -r ./shared_resources ./code-runner

# 3) Build the Docker image from inside 'code-runner' 
cd code-runner

# Build the image
docker buildx build \
  --platform linux/amd64 \
  -t algogptregistry.azurecr.io/algogpt-code-runner:v1.0.8 \
  --push \
  -f Dockerfile \
  .

# 4) Optional: cleanup
cd ..
rm -rf ./code-runner/shared_resources