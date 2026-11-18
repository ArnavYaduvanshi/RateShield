FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/dashboard/package.json ./apps/dashboard/package.json
COPY apps/package/sdk/package.json ./apps/package/sdk/package.json
COPY apps/package/shared/package.json ./apps/package/shared/package.json
RUN npm ci
COPY apps/api ./apps/api
COPY apps/dashboard ./apps/dashboard
COPY apps/package ./apps/package
RUN npm run build --workspace=apps/dashboard

FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/dashboard/package.json ./apps/dashboard/package.json
COPY apps/package/sdk/package.json ./apps/package/sdk/package.json
COPY apps/package/shared/package.json ./apps/package/shared/package.json
RUN npm ci --omit=dev --workspace=apps/api --workspace=apps/package/shared
COPY apps/api ./apps/api
COPY apps/package/shared ./apps/package/shared
COPY --from=builder /app/apps/dashboard/dist ./apps/dashboard/dist
WORKDIR /app/apps/api
EXPOSE 3000
CMD ["npm", "start"]