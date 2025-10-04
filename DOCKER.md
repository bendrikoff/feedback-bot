# 🐳 Docker Deployment

## 🚀 Быстрый старт

### 1. Локальная разработка

```bash
# Сборка и запуск
docker-compose up --build

# Только сборка
docker build -t feedback-bot .

# Запуск с переменными окружения
docker run -e BOT_TOKEN=your_token -e ADMIN_USER_ID=your_id feedback-bot
```

### 2. Развертывание на сервере

#### Автоматическое развертывание (GitHub Actions)

1. **Настройте GitHub Secrets:**
   - `DOCKER_USERNAME` - ваш Docker Hub username
   - `DOCKER_PASSWORD` - ваш Docker Hub password/token
   - `SERVER_HOST` - IP адрес сервера
   - `SERVER_USER` - пользователь для SSH (обычно root)
   - `SERVER_SSH_KEY` - приватный SSH ключ

2. **На сервере выполните:**
   ```bash
   # Скачайте и запустите скрипт развертывания
   curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/feedback-bot/main/deploy.sh | bash
   ```

#### Ручное развертывание

1. **Подготовьте сервер:**
   ```bash
   # Установите Docker и Docker Compose
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   
   # Установите Docker Compose
   curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   chmod +x /usr/local/bin/docker-compose
   ```

2. **Создайте директорию проекта:**
   ```bash
   mkdir -p /opt/feedback-bot/{data,logs}
   cd /opt/feedback-bot
   ```

3. **Создайте .env файл:**
   ```bash
   cat > .env << EOF
   BOT_TOKEN=your_bot_token_here
   ADMIN_USER_ID=your_admin_user_id_here
   EOF
   ```

4. **Скопируйте docker-compose.prod.yml:**
   ```bash
   cp docker-compose.prod.yml docker-compose.yml
   ```

5. **Запустите бота:**
   ```bash
   docker-compose up -d
   ```

## 🔧 Управление

### Основные команды

```bash
# Запуск
docker-compose up -d

# Остановка
docker-compose down

# Перезапуск
docker-compose restart

# Просмотр логов
docker-compose logs -f

# Обновление образа
docker-compose pull
docker-compose up -d
```

### Мониторинг

```bash
# Статус контейнера
docker-compose ps

# Использование ресурсов
docker stats feedback-bot

# Логи в реальном времени
docker-compose logs -f --tail=100
```

## 📁 Структура файлов

```
/opt/feedback-bot/
├── docker-compose.yml      # Конфигурация Docker Compose
├── .env                    # Переменные окружения
├── data/                   # База данных SQLite
│   └── database.sqlite
└── logs/                   # Логи приложения
    └── app.log
```

## 🔒 Безопасность

- Контейнер запускается от непривилегированного пользователя
- Данные сохраняются в volume для персистентности
- Логирование настроено с ротацией
- Автоматический перезапуск при сбоях

## 🐛 Отладка

### Проблемы с запуском

```bash
# Проверьте логи
docker-compose logs

# Проверьте статус
docker-compose ps

# Проверьте переменные окружения
docker-compose config
```

### Проблемы с базой данных

```bash
# Проверьте права доступа
ls -la data/

# Пересоздайте volume
docker-compose down -v
docker-compose up -d
```

## 📊 Мониторинг и алерты

### Настройка мониторинга

```bash
# Установите Docker monitoring
docker run -d --name=cadvisor \
  --volume=/:/rootfs:ro \
  --volume=/var/run:/var/run:ro \
  --volume=/sys:/sys:ro \
  --volume=/var/lib/docker/:/var/lib/docker:ro \
  --publish=8080:8080 \
  gcr.io/cadvisor/cadvisor:latest
```

### Автоматические алерты

```bash
# Скрипт для проверки здоровья
cat > health-check.sh << 'EOF'
#!/bin/bash
if ! docker-compose ps | grep -q "Up"; then
    echo "Bot is down! Restarting..."
    docker-compose restart
    # Отправить уведомление (email, Slack, etc.)
fi
EOF

# Добавьте в crontab
echo "*/5 * * * * /opt/feedback-bot/health-check.sh" | crontab -
```
