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

# Создаем директории для базы данных и логов
RUN mkdir -p /app/data /app/logs

# Переключаемся на непривилегированного пользователя
USER botuser

# Убеждаемся что пользователь может создавать файлы
RUN touch /app/data/.test && rm /app/data/.test || true

# Открываем порт (если понадобится в будущем)
EXPOSE 3000

# Команда запуска
CMD ["node", "dist/index.js"]
