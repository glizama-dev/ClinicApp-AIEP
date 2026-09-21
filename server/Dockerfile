# Build context = raiz del repo (ver docker-compose.yml).
FROM node:20-alpine

WORKDIR /app

# Dependencias (capa cacheable)
COPY server/package.json ./
RUN npm install --omit=dev

# Codigo del backend
COPY server/ ./

# Frontend estatico. En docker-compose se monta ademas como volumen para
# desarrollo con recarga.
RUN mkdir -p /app/public
COPY index.html ficha-podologia.html ficha-cosmetologia.html /app/public/
COPY css/ /app/public/css/
COPY js/ /app/public/js/
COPY img/ /app/public/img/

ENV NODE_ENV=production
ENV STATIC_DIR=/app/public

EXPOSE 3000

CMD ["sh", "-c", "npm run migrate && npm start"]
