#!/bin/bash
echo "🔨 Building Sandbox Environment Images..."

echo "1/2 Building Python Sandbox..."
docker build -t judge-python packages/judge-worker/docker/judge-python

echo "2/2 Building C++ Sandbox..."
docker build -t judge-cpp packages/judge-worker/docker/judge-cpp

echo "✅ All sandbox images built successfully."