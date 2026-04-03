FROM node:22-alpine

WORKDIR /app

ARG VITE_AI_API_URL=http://localhost:8000
ENV VITE_AI_API_URL=$VITE_AI_API_URL

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE 4173

CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "4173"]

