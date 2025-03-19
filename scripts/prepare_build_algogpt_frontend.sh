#!/usr/bin/env bash

# Build the frontend image
docker buildx build \
  --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSyArCG6uAdREGW7ulJNt1ExGQllgmsq2Ock" \
  --build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="algogpt-9b0b3.firebaseapp.com" \
  --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID="algogpt-9b0b3" \
  --build-arg NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="algogpt-9b0b3.firebasestorage.app" \
  --build-arg NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="260425872922" \
  --build-arg NEXT_PUBLIC_FIREBASE_APP_ID="1:260425872922:web:620642fba9debfea7fc3a3" \
  --build-arg NEXT_PUBLIC_API_URL="http://localhost:8000" \
  --build-arg NEXT_PUBLIC_WS_URL="ws://localhost:8000" \
  --build-arg NEXT_PUBLIC_LSP_HOST="localhost" \
  --build-arg NEXT_PUBLIC_LSP_PORT="30001" \
  -t algogptregistry.azurecr.io/algogpt-frontend:v1.0.8 \
  --push \
  ./algogpt-frontend