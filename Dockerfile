# Stage 1: Build the React Application
FROM node:20-alpine as build

WORKDIR /app

# Copy package files first to leverage cache
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY . .

# Build args
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

# Build the application
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy built assets from builder stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
