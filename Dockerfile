# Etapa 1: Build del Frontend (Vite + React)
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Etapa 2: Servidor Backend (Node + Express)
FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm install --production
COPY backend/ ./

# Copiar el compilado estático del frontend a la carpeta public del backend
COPY --from=frontend-builder /frontend/dist ./public

# Crear directorio para persistencia de la base de datos JSON
RUN mkdir -p data

EXPOSE 5000
ENV PORT=5000

CMD ["npm", "start"]
