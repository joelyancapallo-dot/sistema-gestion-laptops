# syntax=docker/dockerfile:1
# Imagen única del sistema: el servidor Express sirve la API y la web ya
# compilada (client/dist) por el mismo puerto. La construye y la sube a Harbor
# «deploy/sislaptop.sh publicar».

# --- 1. Compilar la web (React + Vite) ---------------------------------------
FROM node:24-alpine AS web
WORKDIR /app/client
COPY client/package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY client/ ./
RUN npm run build

# --- 2. Servidor de producción ------------------------------------------------
FROM node:24-alpine
ENV NODE_ENV=production \
    TZ=America/Lima \
    PORT=5000
RUN apk add --no-cache tzdata
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY server/ ./server/
COPY --from=web /app/client/dist ./client/dist
# Las fotos van en un disco aparte (en k3s: el PVC «sislaptop-fotos»)
RUN mkdir -p server/uploads/laptops && chown -R node:node server/uploads
USER node
EXPOSE 5000
CMD ["node", "server/server.js"]
