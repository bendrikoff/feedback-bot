# Используем официальный Node.js образ
FROM node:20-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production && npm cache clean --force

# Копируем собранное приложение
COPY dist/ ./dist/

# Создаем пользователя для безопасности
RUN addgroup -g 1001 -S nodejs && \
    adduser -S botuser -u 1001

# Создаем директорию для базы данных
RUN mkdir -p /app/data && chown -R botuser:nodejs /app

# Переключаемся на непривилегированного пользователя
USER botuser

# Открываем порт (если понадобится в будущем)
EXPOSE 3000

# Команда запуска
CMD ["node", "dist/index.js"]
