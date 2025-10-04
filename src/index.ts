import dotenv from 'dotenv';
import { FeedbackBot } from './bot';
import { BotConfig } from './types';

// Загружаем переменные окружения
dotenv.config();

// Проверяем наличие необходимых переменных
const requiredEnvVars = ['BOT_TOKEN', 'ADMIN_USER_ID'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Ошибка: переменная окружения ${envVar} не установлена`);
    console.error('📝 Создайте файл .env на основе env.example и заполните необходимые значения');
    process.exit(1);
  }
}

const config: BotConfig = {
  token: process.env.BOT_TOKEN!,
  adminUserId: parseInt(String(process.env.ADMIN_USER_ID).replace(/['"]/g, '')),
  databasePath: process.env.DATABASE_PATH || './database.sqlite'
};

// Проверяем корректность adminUserId
if (isNaN(config.adminUserId) || config.adminUserId === 0) {
  console.error('❌ Ошибка: ADMIN_USER_ID должен быть числом');
  console.error(`📝 Текущее значение: "${process.env.ADMIN_USER_ID}"`);
  process.exit(1);
}

console.log('🚀 Запуск Telegram бота обратной связи...');
console.log(`👤 Администратор: ${config.adminUserId}`);
console.log(`💾 База данных: ${config.databasePath}`);

// Создаем и запускаем бота
const bot = new FeedbackBot(config);
bot.start();
