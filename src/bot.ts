import { Telegraf, Context } from 'telegraf';
import { Database } from './database';
import { BotConfig, User } from './types';

export class FeedbackBot {
  private bot: Telegraf;
  private database: Database;
  private config: BotConfig;

  constructor(config: BotConfig) {
    this.config = config;
    this.bot = new Telegraf(config.token);
    this.database = new Database({ path: config.databasePath });
    this.setupCommands();
    this.setupMiddleware();
  }

  private setupMiddleware(): void {
    // Middleware для проверки бана
    this.bot.use(async (ctx, next) => {
      const userId = ctx.from?.id;
      if (!userId) {
        return next();
      }

      const user = await this.database.getUser(userId);
      if (user && user.is_banned) {
        await ctx.reply('❌ Вы заблокированы и не можете использовать бота.');
        return;
      }

      return next();
    });

    // Middleware для регистрации пользователей
    this.bot.use(async (ctx, next) => {
      const userId = ctx.from?.id;
      if (!userId) {
        return next();
      }

      const existingUser = await this.database.getUser(userId);
      if (!existingUser) {
        const newUser: Omit<User, 'created_at'> = {
          id: userId,
          username: ctx.from.username,
          first_name: ctx.from.first_name,
          last_name: ctx.from.last_name,
          is_banned: false
        };
        await this.database.createUser(newUser);
      }

      return next();
    });
  }

  private setupCommands(): void {
    // Команда /start
    this.bot.start((ctx) => {
      ctx.reply(
        '👋 Добро пожаловать в бота обратной связи!\n\n' +
        '📝 Отправьте ваше сообщение, и оно будет передано администратору.\n' +
        '🔧 Доступные команды:\n' +
        '/help - показать справку\n' +
        '/feedback - отправить обратную связь'
      );
    });

    // Команда /help
    this.bot.help((ctx) => {
      ctx.reply(
        '📋 Справка по боту:\n\n' +
        '📝 Для отправки обратной связи просто напишите сообщение боту\n' +
        '🔧 Команды:\n' +
        '/start - начать работу с ботом\n' +
        '/help - показать эту справку\n' +
        '/feedback - отправить обратную связь\n\n' +
        '❓ Если у вас есть вопросы или предложения, просто напишите их боту!'
      );
    });

    // Команда /feedback
    this.bot.command('feedback', (ctx) => {
      ctx.reply(
        '📝 Отправьте ваше сообщение с обратной связью.\n\n' +
        'Вы можете написать:\n' +
        '• Предложения по улучшению\n' +
        '• Сообщения об ошибках\n' +
        '• Отзывы о работе\n' +
        '• Любые другие вопросы\n\n' +
        'Просто напишите ваше сообщение в следующем сообщении.'
      );
    });

    // Админские команды
    this.bot.command('admin', async (ctx) => {
      if (ctx.from?.id !== this.config.adminUserId) {
        ctx.reply('❌ У вас нет прав администратора.');
        return;
      }

      ctx.reply(
        '🔧 Панель администратора:\n\n' +
        '/ban <user_id> - заблокировать пользователя\n' +
        '/unban <user_id> - разблокировать пользователя\n' +
        '/feedback_list - показать список обратной связи\n' +
        '/banned_users - показать заблокированных пользователей\n' +
        '/stats - статистика бота'
      );
    });

    this.bot.command('ban', async (ctx) => {
      if (ctx.from?.id !== this.config.adminUserId) {
        ctx.reply('❌ У вас нет прав администратора.');
        return;
      }

      const args = ctx.message.text.split(' ');
      if (args.length < 2) {
        ctx.reply('❌ Использование: /ban <user_id>');
        return;
      }

      const userId = parseInt(args[1]);
      if (isNaN(userId)) {
        ctx.reply('❌ Неверный ID пользователя.');
        return;
      }

      try {
        await this.database.banUser(userId);
        ctx.reply(`✅ Пользователь ${userId} заблокирован.`);
      } catch (error) {
        ctx.reply('❌ Ошибка при блокировке пользователя.');
        console.error('Ban error:', error);
      }
    });

    this.bot.command('unban', async (ctx) => {
      if (ctx.from?.id !== this.config.adminUserId) {
        ctx.reply('❌ У вас нет прав администратора.');
        return;
      }

      const args = ctx.message.text.split(' ');
      if (args.length < 2) {
        ctx.reply('❌ Использование: /unban <user_id>');
        return;
      }

      const userId = parseInt(args[1]);
      if (isNaN(userId)) {
        ctx.reply('❌ Неверный ID пользователя.');
        return;
      }

      try {
        await this.database.unbanUser(userId);
        ctx.reply(`✅ Пользователь ${userId} разблокирован.`);
      } catch (error) {
        ctx.reply('❌ Ошибка при разблокировке пользователя.');
        console.error('Unban error:', error);
      }
    });

    this.bot.command('feedback_list', async (ctx) => {
      if (ctx.from?.id !== this.config.adminUserId) {
        ctx.reply('❌ У вас нет прав администратора.');
        return;
      }

      try {
        const feedback = await this.database.getFeedback(10);
        if (feedback.length === 0) {
          ctx.reply('📝 Нет сообщений обратной связи.');
          return;
        }

        let message = '📝 Последние сообщения обратной связи:\n\n';
        for (const item of feedback) {
          const user = await this.database.getUser(item.user_id);
          const userName = user ? 
            `${user.first_name || ''} ${user.last_name || ''}`.trim() || 
            user.username || 
            `ID: ${user.id}` : 
            `ID: ${item.user_id}`;
          
          message += `🆔 ID: ${item.id}\n`;
          message += `👤 От: ${userName}\n`;
          message += `📅 Дата: ${new Date(item.created_at).toLocaleString('ru-RU')}\n`;
          message += `📝 Сообщение: ${item.message}\n`;
          message += `✅ Обработано: ${item.is_processed ? 'Да' : 'Нет'}\n\n`;
        }

        ctx.reply(message);
      } catch (error) {
        ctx.reply('❌ Ошибка при получении списка обратной связи.');
        console.error('Feedback list error:', error);
      }
    });

    this.bot.command('banned_users', async (ctx) => {
      if (ctx.from?.id !== this.config.adminUserId) {
        ctx.reply('❌ У вас нет прав администратора.');
        return;
      }

      try {
        const bannedUsers = await this.database.getBannedUsers();
        if (bannedUsers.length === 0) {
          ctx.reply('✅ Нет заблокированных пользователей.');
          return;
        }

        let message = '🚫 Заблокированные пользователи:\n\n';
        for (const user of bannedUsers) {
          const userName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 
                          user.username || 
                          `ID: ${user.id}`;
          message += `👤 ${userName} (ID: ${user.id})\n`;
          message += `📅 Заблокирован: ${new Date(user.created_at).toLocaleString('ru-RU')}\n\n`;
        }

        ctx.reply(message);
      } catch (error) {
        ctx.reply('❌ Ошибка при получении списка заблокированных пользователей.');
        console.error('Banned users error:', error);
      }
    });

    this.bot.command('stats', async (ctx) => {
      if (ctx.from?.id !== this.config.adminUserId) {
        ctx.reply('❌ У вас нет прав администратора.');
        return;
      }

      try {
        const feedback = await this.database.getFeedback(1000); // Получаем больше для статистики
        const bannedUsers = await this.database.getBannedUsers();
        
        const totalFeedback = feedback.length;
        const processedFeedback = feedback.filter(f => f.is_processed).length;
        const unprocessedFeedback = totalFeedback - processedFeedback;

        ctx.reply(
          '📊 Статистика бота:\n\n' +
          `📝 Всего сообщений обратной связи: ${totalFeedback}\n` +
          `✅ Обработано: ${processedFeedback}\n` +
          `⏳ Не обработано: ${unprocessedFeedback}\n` +
          `🚫 Заблокированных пользователей: ${bannedUsers.length}`
        );
      } catch (error) {
        ctx.reply('❌ Ошибка при получении статистики.');
        console.error('Stats error:', error);
      }
    });

    // Обработка обычных сообщений (обратная связь)
    this.bot.on('text', async (ctx) => {
      const message = ctx.message.text;
      
      // Игнорируем команды
      if (message.startsWith('/')) {
        return;
      }

      try {
        await this.database.addFeedback(ctx.from!.id, message);
        
        // Уведомляем администратора
        await this.bot.telegram.sendMessage(
          this.config.adminUserId,
          `📝 Новое сообщение обратной связи:\n\n` +
          `👤 От: ${ctx.from.first_name || ''} ${ctx.from.last_name || ''}`.trim() || 
          ctx.from.username || 
          `ID: ${ctx.from.id}\n` +
          `📅 Дата: ${new Date().toLocaleString('ru-RU')}\n` +
          `📝 Сообщение: ${message}`
        );

        ctx.reply(
          '✅ Ваше сообщение получено и передано администратору!\n\n' +
          'Спасибо за обратную связь! 🙏'
        );
      } catch (error) {
        ctx.reply('❌ Произошла ошибка при отправке сообщения. Попробуйте позже.');
        console.error('Feedback error:', error);
      }
    });
  }

  public start(): void {
    this.bot.launch();
    console.log('🤖 Бот запущен!');
    
    // Graceful stop
    process.once('SIGINT', () => this.bot.stop('SIGINT'));
    process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
  }

  public stop(): void {
    this.bot.stop();
    this.database.close();
    console.log('🛑 Бот остановлен');
  }
}
