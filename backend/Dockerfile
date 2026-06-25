FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

# Asegurar que existe la carpeta para la base de datos JSON
RUN mkdir -p data

EXPOSE 5000

CMD ["npm", "start"]
