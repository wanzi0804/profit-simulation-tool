FROM node:20-alpine

WORKDIR /app
COPY package.json ./
COPY index.html styles.css script.js server.js ./

ENV NODE_ENV=production
ENV PORT=4177
EXPOSE 4177

CMD ["node", "server.js"]
