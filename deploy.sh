#!/bin/bash

# Скрипт для развертывания Feedback Bot на сервере
# Использование: ./deploy.sh

set -e

echo "🚀 Начинаем развертывание Feedback Bot..."

# Проверяем наличие Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен. Устанавливаем..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl enable docker
    systemctl start docker
fi

# Проверяем наличие Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не установлен. Устанавливаем..."
    curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# Создаем директории
echo "📁 Создаем директории..."
mkdir -p /opt/feedback-bot/{data,logs}
cd /opt/feedback-bot

# Создаем .env файл если его нет
if [ ! -f .env ]; then
    echo "📝 Создаем .env файл..."
    cat > .env << EOF
BOT_TOKEN=your_bot_token_here
ADMIN_USER_ID=your_admin_user_id_here
EOF
    echo "⚠️  Не забудьте заполнить .env файл!"
fi

# Копируем docker-compose.prod.yml если его нет
if [ ! -f docker-compose.yml ]; then
    echo "📋 Создаем docker-compose.yml..."
    cp docker-compose.prod.yml docker-compose.yml
fi

# Останавливаем старый контейнер
echo "🛑 Останавливаем старый контейнер..."
docker-compose down || true

# Обновляем образ
echo "📦 Обновляем Docker образ..."
docker-compose pull

# Запускаем новый контейнер
echo "▶️  Запускаем новый контейнер..."
docker-compose up -d

# Очищаем старые образы
echo "🧹 Очищаем старые образы..."
docker image prune -f

# Показываем статус
echo "📊 Статус контейнера:"
docker-compose ps

echo "✅ Развертывание завершено!"
echo "📋 Для просмотра логов: docker-compose logs -f"
echo "🔄 Для перезапуска: docker-compose restart"
echo "🛑 Для остановки: docker-compose down"
