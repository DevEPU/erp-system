FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and build production bundle
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV INTERNAL_BACKEND_URL=http://erp-backend:2121
RUN npm run build

EXPOSE 1212
ENV PORT=1212

CMD ["npm", "run", "start"]
