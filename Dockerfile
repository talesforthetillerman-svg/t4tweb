# Development/Audit image for t4tweb-1
# Usage: docker build -t t4tweb:audit .

FROM node:20-slim

WORKDIR /app

# Enable corepack and pnpm
RUN corepack enable pnpm

# Copy dependency files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies (locked versions)
RUN pnpm install --frozen-lockfile

# Copy project (excluding items in .dockerignore)
COPY . .

# Expose dev port
EXPOSE 3000

# Run dev server with hostname 0.0.0.0 to listen from outside container
CMD ["pnpm", "dev", "--hostname", "0.0.0.0"]
