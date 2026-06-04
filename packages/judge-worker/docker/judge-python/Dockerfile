# Use a lightweight Alpine Linux base
FROM python:3.11-alpine

# Create a non-root user for security (UID 1000)
RUN adduser -D -u 1000 sandboxuser

# Set working directory
WORKDIR /sandbox

# Change ownership of the sandbox directory to our non-root user
RUN chown -R sandboxuser:sandboxuser /sandbox

# Switch to the non-root user
USER sandboxuser

# The entrypoint will be overridden by dockerode during execution, 
# but we set a safe default.
CMD ["python3"]
