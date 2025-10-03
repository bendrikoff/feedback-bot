import { Telegraf, Markup } from 'telegraf';
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

      const user = this.database.getUser(userId);
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

      const existingUser = this.database.getUser(userId);
      if (!existingUser) {
        const newUser: Omit<User, 'created_at'> = {
          id: userId,
          username: ctx.from.username || null,
          first_name: ctx.from.first_name || null,
          last_name: ctx.from.last_name || null,
          is_banned: false
        };
        this.database.createUser(newUser);
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
        '/process <feedback_id> - отметить сообщение как обработанное\n' +
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
        this.database.banUser(userId);
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
        this.database.unbanUser(userId);
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
        const feedback = this.database.getFeedback(10);
        if (feedback.length === 0) {
          ctx.reply('📝 Нет сообщений обратной связи.');
          return;
        }

        let message = '📝 Последние сообщения обратной связи:\n\n';
        for (const item of feedback) {
          const user = this.database.getUser(item.user_id);
          const userName = user ? 
            `${user.first_name || ''} ${user.last_name || ''}`.trim() || 
            user.username || 
            `ID: ${user.id}` : 
            `ID: ${item.user_id}`;
          
          message += `🆔 ID: ${item.id}\n`;
          message += `👤 От: ${userName}\n`;
          message += `📅 Дата: ${new Date(item.created_at).toLocaleString('ru-RU')}\n`;
          message += `📝 Сообщение: ${item.message}\n`;
          message += `${item.is_processed ? '✅ Обработано' : '⏳ Не обработано'}\n\n`;
        }

        ctx.reply(message, {
          reply_markup: {
            inline_keyboard: [
              [
                Markup.button.callback('🔄 Обновить список', 'refresh_feedback_list'),
                Markup.button.callback('📊 Статистика', 'show_stats')
              ],
              [
                Markup.button.callback('🚫 Заблокированные', 'show_banned_users')
              ]
            ]
          }
        });
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
        const bannedUsers = this.database.getBannedUsers();
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
        const feedback = this.database.getFeedback(1000); // Получаем больше для статистики
        const bannedUsers = this.database.getBannedUsers();
        
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

    // Обработка ответов администратора на уведомления
    this.bot.on('text', async (ctx) => {
      const message = ctx.message.text;
      
      // Игнорируем команды
      if (message.startsWith('/')) {
        return;
      }

      // Проверяем, является ли это ответом администратора на уведомление
      if (ctx.from?.id === this.config.adminUserId && ctx.message.reply_to_message) {
        const replyMessage = ctx.message.reply_to_message;
        
        // Проверяем, что это уведомление о новой обратной связи
        if ('text' in replyMessage && replyMessage.text && replyMessage.text.includes('📝 Новое сообщение обратной связи:')) {
          try {
            // Извлекаем ID пользователя из оригинального сообщения
            const originalText = replyMessage.text;
            const userIdMatch = originalText.match(/👤 От: .+ \(ID: (\d+)\)/);
            
            console.log('Debug: Original text:', originalText);
            console.log('Debug: User ID match:', userIdMatch);
            
            if (userIdMatch) {
              const userId = parseInt(userIdMatch[1]);
              console.log('Debug: User ID:', userId);
              
              // Отправляем ответ пользователю
              await this.bot.telegram.sendMessage(
                userId,
                `💬 Ответ от администратора:\n\n${message}`
              );
              
              // Находим сообщение по ID пользователя и отмечаем как обработанное
              const feedback = this.database.getFeedback(100);
              const userFeedback = feedback.find(f => f.user_id === userId && !f.is_processed);
              
              if (userFeedback) {
                this.database.markFeedbackAsProcessed(userFeedback.id);
                console.log('Debug: Marked feedback as processed:', userFeedback.id);
              }
              
              // Подтверждаем администратору
              ctx.reply('✅ Ответ отправлен пользователю!');
              return;
            }
            
            ctx.reply('❌ Не удалось найти ID пользователя в сообщении.');
          } catch (error) {
            ctx.reply('❌ Ошибка при отправке ответа пользователю.');
            console.error('Reply error:', error);
          }
          return;
        }
      }

      // Обычная обработка сообщений обратной связи
      try {
        // Убеждаемся, что пользователь существует в базе данных
        const existingUser = this.database.getUser(ctx.from!.id);
        if (!existingUser) {
          const newUser: Omit<User, 'created_at'> = {
            id: ctx.from!.id,
            username: ctx.from.username || null,
            first_name: ctx.from.first_name || null,
            last_name: ctx.from.last_name || null,
            is_banned: false
          };
          this.database.createUser(newUser);
          console.log('Debug: Created new user:', newUser);
        }
        
        // Уведомляем администратора
        const userName = `${ctx.from.first_name || ''} ${ctx.from.last_name || ''}`.trim() || 
                        ctx.from.username || 
                        `ID: ${ctx.from.id}`;
        
        // Добавляем сообщение в базу данных
        this.database.addFeedback(ctx.from!.id, message);
        
        // Получаем ID добавленного сообщения
        const feedback = this.database.getFeedback(1);
        const feedbackId = feedback[0]?.id || 1;
        
        await this.bot.telegram.sendMessage(
          this.config.adminUserId,
          `📝 Новое сообщение обратной связи:\n\n` +
          `🆔 ID: ${feedbackId}\n` +
          `👤 От: ${userName} (ID: ${ctx.from.id})\n` +
          `📅 Дата: ${new Date().toLocaleString('ru-RU')}\n` +
          `📝 Сообщение: ${message}\n\n` +
          `💬 Ответьте на это сообщение или используйте кнопки ниже`,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  Markup.button.callback('✅ Обработано', `process_${feedbackId}`)
                ],
                [
                  Markup.button.callback('🚫 Заблокировать', `ban_${ctx.from.id}`)
                ]
              ]
            }
          }
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

    // Обработка callback кнопок
    this.bot.action(/^process_(\d+)$/, async (ctx) => {
      if (ctx.from?.id !== this.config.adminUserId) {
        ctx.answerCbQuery('❌ У вас нет прав администратора.');
        return;
      }

      const feedbackId = parseInt(ctx.match[1]);
      
      try {
        this.database.markFeedbackAsProcessed(feedbackId);
        ctx.answerCbQuery('✅ Сообщение отмечено как обработанное');
        
        // Обновляем сообщение с кнопками
        ctx.editMessageReplyMarkup({
          inline_keyboard: [
            [
              Markup.button.callback('✅ Обработано', `processed_${feedbackId}`, true)
            ],
            [
              Markup.button.callback('🚫 Заблокировать', `ban_${feedbackId}`)
            ]
          ]
        });
      } catch (error) {
        ctx.answerCbQuery('❌ Ошибка при обработке');
        console.error('Process callback error:', error);
      }
    });


    this.bot.action(/^ban_(\d+)$/, async (ctx) => {
      if (ctx.from?.id !== this.config.adminUserId) {
        ctx.answerCbQuery('❌ У вас нет прав администратора.');
        return;
      }

      const feedbackId = parseInt(ctx.match[1]);
      
      try {
        // Находим сообщение по ID, чтобы получить user_id
        const feedback = this.database.getFeedback(1000);
        const matchingFeedback = feedback.find(f => f.id === feedbackId);
        
        if (matchingFeedback) {
          this.database.banUser(matchingFeedback.user_id);
          ctx.answerCbQuery('🚫 Пользователь заблокирован');
          
          // Обновляем сообщение с кнопками
          ctx.editMessageReplyMarkup({
            inline_keyboard: [
              [
                Markup.button.callback('✅ Обработано', `process_${feedbackId}`)
              ],
              [
                Markup.button.callback('🚫 Заблокирован', `banned_${feedbackId}`, true)
              ]
            ]
          });
        } else {
          ctx.answerCbQuery('❌ Сообщение не найдено');
        }
      } catch (error) {
        ctx.answerCbQuery('❌ Ошибка при блокировке');
        console.error('Ban callback error:', error);
      }
    });

    // Обработка уже обработанных кнопок (disabled)
    this.bot.action(/^(processed|banned)_/, (ctx) => {
      ctx.answerCbQuery('Это действие уже выполнено');
    });

    // Обработка кнопок управления
    this.bot.action('refresh_feedback_list', async (ctx) => {
      if (ctx.from?.id !== this.config.adminUserId) {
        ctx.answerCbQuery('❌ У вас нет прав администратора.');
        return;
      }

      try {
        const feedback = this.database.getFeedback(10);
        if (feedback.length === 0) {
          ctx.editMessageText('📝 Нет сообщений обратной связи.');
          return;
        }

        let message = '📝 Последние сообщения обратной связи:\n\n';
        for (const item of feedback) {
          const user = this.database.getUser(item.user_id);
          const userName = user ? 
            `${user.first_name || ''} ${user.last_name || ''}`.trim() || 
            user.username || 
            `ID: ${user.id}` : 
            `ID: ${item.user_id}`;
          
          message += `🆔 ID: ${item.id}\n`;
          message += `👤 От: ${userName}\n`;
          message += `📅 Дата: ${new Date(item.created_at).toLocaleString('ru-RU')}\n`;
          message += `📝 Сообщение: ${item.message}\n`;
          message += `${item.is_processed ? '✅ Обработано' : '⏳ Не обработано'}\n\n`;
        }

        ctx.editMessageText(message, {
          reply_markup: {
            inline_keyboard: [
              [
                Markup.button.callback('🔄 Обновить список', 'refresh_feedback_list'),
                Markup.button.callback('📊 Статистика', 'show_stats')
              ],
              [
                Markup.button.callback('🚫 Заблокированные', 'show_banned_users')
              ]
            ]
          }
        });
        ctx.answerCbQuery('✅ Список обновлен');
      } catch (error) {
        ctx.answerCbQuery('❌ Ошибка при обновлении');
        console.error('Refresh feedback list error:', error);
      }
    });

    this.bot.action('show_stats', async (ctx) => {
      if (ctx.from?.id !== this.config.adminUserId) {
        ctx.answerCbQuery('❌ У вас нет прав администратора.');
        return;
      }

      try {
        const feedback = this.database.getFeedback(1000);
        const bannedUsers = this.database.getBannedUsers();
        
        const totalFeedback = feedback.length;
        const processedFeedback = feedback.filter(f => f.is_processed).length;
        const unprocessedFeedback = totalFeedback - processedFeedback;

        const statsMessage = 
          '📊 Статистика бота:\n\n' +
          `📝 Всего сообщений обратной связи: ${totalFeedback}\n` +
          `✅ Обработано: ${processedFeedback}\n` +
          `⏳ Не обработано: ${unprocessedFeedback}\n` +
          `🚫 Заблокированных пользователей: ${bannedUsers.length}`;

        ctx.editMessageText(statsMessage, {
          reply_markup: {
            inline_keyboard: [
              [
                Markup.button.callback('📝 Список сообщений', 'refresh_feedback_list'),
                Markup.button.callback('🚫 Заблокированные', 'show_banned_users')
              ]
            ]
          }
        });
        ctx.answerCbQuery('📊 Статистика показана');
      } catch (error) {
        ctx.answerCbQuery('❌ Ошибка при получении статистики');
        console.error('Show stats error:', error);
      }
    });

    this.bot.action('show_banned_users', async (ctx) => {
      if (ctx.from?.id !== this.config.adminUserId) {
        ctx.answerCbQuery('❌ У вас нет прав администратора.');
        return;
      }

      try {
        const bannedUsers = this.database.getBannedUsers();
        if (bannedUsers.length === 0) {
          ctx.editMessageText('✅ Нет заблокированных пользователей.');
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

        ctx.editMessageText(message, {
          reply_markup: {
            inline_keyboard: [
              [
                Markup.button.callback('📝 Список сообщений', 'refresh_feedback_list'),
                Markup.button.callback('📊 Статистика', 'show_stats')
              ]
            ]
          }
        });
        ctx.answerCbQuery('🚫 Список заблокированных показан');
      } catch (error) {
        ctx.answerCbQuery('❌ Ошибка при получении списка');
        console.error('Show banned users error:', error);
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
