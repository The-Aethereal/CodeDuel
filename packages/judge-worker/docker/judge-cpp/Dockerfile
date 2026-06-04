# Use the official GCC image
FROM gcc:13-bookworm

# Create a non-root user
RUN useradd -m -u 1000 sandboxuser

# Set working directory
WORKDIR /sandbox

# Change ownership
RUN chown -R sandboxuser:sandboxuser /sandbox

# Switch to the non-root user
USER sandboxuser

# Default command
CMD ["bash"]