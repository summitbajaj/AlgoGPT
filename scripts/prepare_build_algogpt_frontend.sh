#!/usr/bin/env bash

# Build the frontend image with production values
docker buildx build \
  --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_API_URL="https://algogpt-api-server-fjhufjatfmdufpgj.southeastasia-01.azurewebsites.net" \
  --build-arg NEXT_PUBLIC_WS_URL="wss://algogpt-api-server-fjhufjatfmdufpgj.southeastasia-01.azurewebsites.net" \
  --build-arg NEXT_PUBLIC_LSP_HOST="algogpt-lsp-backend-a2c0hjajg4c0d8fx.southeastasia-01.azurewebsites.net" \
  --build-arg NEXT_PUBLIC_LSP_PORT="443" \
  --build-arg NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSyArCG6uAdREGW7ulJNt1ExGQllgmsq2Ock" \
  --build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="algogpt-9b0b3.firebaseapp.com" \
  --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID="algogpt-9b0b3" \
  --build-arg NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="algogpt-9b0b3.firebasestorage.app" \
  --build-arg NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="260425872922" \
  --build-arg NEXT_PUBLIC_FIREBASE_APP_ID="1:260425872922:web:620642fba9debfea7fc3a3" \
  -t algogptregistry.azurecr.io/algogpt-frontend:v1.0.9 \
  --push \
  ./algogpt-frontend