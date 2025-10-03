# 🔐 Настройка GitHub Secrets для Docker Deploy

Для автоматического развертывания через GitHub Actions необходимо настроить следующие секреты в вашем репозитории.

## 📋 Необходимые Secrets

### 1. Docker Hub Credentials

| Secret | Описание | Пример |
|--------|----------|--------|
| `DOCKER_USERNAME` | Ваш Docker Hub username | `myusername` |
| `DOCKER_PASSWORD` | Docker Hub password или access token | `mypassword` или `dckr_pat_...` |

### 2. Server Credentials

| Secret | Описание | Пример |
|--------|----------|--------|
| `SERVER_HOST` | IP адрес или домен сервера | `192.168.1.100` или `myserver.com` |
| `SERVER_USER` | Пользователь для SSH подключения | `root` или `ubuntu` |
| `SERVER_SSH_KEY` | Приватный SSH ключ | `-----BEGIN OPENSSH PRIVATE KEY-----...` |

## 🚀 Пошаговая настройка

### Шаг 1: Создание Docker Hub аккаунта

1. Зарегистрируйтесь на [Docker Hub](https://hub.docker.com/)
2. Создайте новый репозиторий с именем `feedback-bot`
3. Получите access token в настройках аккаунта (рекомендуется вместо пароля)

### Шаг 2: Подготовка сервера

1. **Установите Docker на сервер:**
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   ```

2. **Установите Docker Compose:**
   ```bash
   curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   chmod +x /usr/local/bin/docker-compose
   ```

3. **Создайте директорию проекта:**
   ```bash
   mkdir -p /opt/feedback-bot/{data,logs}
   cd /opt/feedback-bot
   ```

4. **Создайте .env файл:**
   ```bash
   cat > .env << EOF
   BOT_TOKEN=your_bot_token_here
   ADMIN_USER_ID=your_admin_user_id_here
   EOF
   ```

5. **Скопируйте docker-compose.prod.yml:**
   ```bash
   cp docker-compose.prod.yml docker-compose.yml
   ```

### Шаг 3: Настройка SSH ключей

1. **На локальной машине создайте SSH ключ:**
   ```bash
   ssh-keygen -t rsa -b 4096 -C "github-actions"
   ```

2. **Скопируйте публичный ключ на сервер:**
   ```bash
   ssh-copy-id -i ~/.ssh/id_rsa.pub user@your-server
   ```

3. **Проверьте подключение:**
   ```bash
   ssh user@your-server
   ```

### Шаг 4: Настройка GitHub Secrets

1. Перейдите в ваш репозиторий на GitHub
2. Нажмите **Settings** → **Secrets and variables** → **Actions**
3. Нажмите **New repository secret**
4. Добавьте каждый secret:

   ```
   Name: DOCKER_USERNAME
   Value: your_docker_username
   
   Name: DOCKER_PASSWORD
   Value: your_docker_password_or_token
   
   Name: SERVER_HOST
   Value: your_server_ip_or_domain
   
   Name: SERVER_USER
   Value: your_server_user
   
   Name: SERVER_SSH_KEY
   Value: -----BEGIN OPENSSH PRIVATE KEY-----
   your_private_key_content_here
   -----END OPENSSH PRIVATE KEY-----
   ```

### Шаг 5: Обновление docker-compose.prod.yml

Замените `YOUR_DOCKER_USERNAME` в файле `docker-compose.prod.yml` на ваш реальный Docker Hub username:

```yaml
services:
  feedback-bot:
    image: your_username/feedback-bot:latest  # Замените на ваш username
    # ... остальная конфигурация
```

## ✅ Проверка настройки

После настройки всех secrets:

1. Сделайте commit и push в ветку `main`
2. Проверьте вкладку **Actions** в GitHub
3. Должен запуститься workflow "Deploy to Docker"
4. Если все настроено правильно, бот автоматически развернется на сервере

## 🔧 Troubleshooting

### Проблема: "Permission denied (publickey)"

**Решение:**
- Проверьте правильность SSH ключа в `SERVER_SSH_KEY`
- Убедитесь, что публичный ключ добавлен в `~/.ssh/authorized_keys` на сервере
- Проверьте права доступа: `chmod 600 ~/.ssh/authorized_keys`

### Проблема: "Docker login failed"

**Решение:**
- Проверьте правильность `DOCKER_USERNAME` и `DOCKER_PASSWORD`
- Используйте access token вместо пароля
- Убедитесь, что репозиторий `feedback-bot` создан в Docker Hub

### Проблема: "Connection refused"

**Решение:**
- Проверьте правильность `SERVER_HOST` и `SERVER_USER`
- Убедитесь, что SSH сервис запущен на сервере
- Проверьте firewall настройки

### Проблема: "Container failed to start"

**Решение:**
- Проверьте .env файл на сервере
- Убедитесь, что все переменные окружения заполнены
- Проверьте логи: `docker-compose logs`

## 📊 Мониторинг

После успешного развертывания:

```bash
# Проверка статуса
docker-compose ps

# Просмотр логов
docker-compose logs -f

# Мониторинг ресурсов
docker stats feedback-bot
```

## 🔄 Обновление

При каждом push в ветку `main`:
1. GitHub Actions автоматически соберет новый Docker образ
2. Загрузит его в Docker Hub
3. Подключится к серверу и обновит контейнер
4. Перезапустит бота с новой версией
