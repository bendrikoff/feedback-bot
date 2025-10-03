import sqlite3 from 'sqlite3';
import { User, Feedback, DatabaseConfig } from './types';

export class Database {
  private db: sqlite3.Database;

  constructor(config: DatabaseConfig) {
    this.db = new sqlite3.Database(config.path);
    this.initTables();
  }

  private initTables(): void {
    // Создание таблицы пользователей
    this.db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        username TEXT,
        first_name TEXT,
        last_name TEXT,
        is_banned INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Создание таблицы обратной связи
    this.db.run(`
      CREATE TABLE IF NOT EXISTS feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        message TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_processed INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);
  }

  async getUser(userId: number): Promise<User | null> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM users WHERE id = ?',
        [userId],
        (err, row: any) => {
          if (err) {
            reject(err);
          } else {
            resolve(row ? {
              id: row.id,
              username: row.username,
              first_name: row.first_name,
              last_name: row.last_name,
              is_banned: Boolean(row.is_banned),
              created_at: row.created_at
            } : null);
          }
        }
      );
    });
  }

  async createUser(user: Omit<User, 'created_at'>): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT OR REPLACE INTO users (id, username, first_name, last_name, is_banned) VALUES (?, ?, ?, ?, ?)',
        [user.id, user.username, user.first_name, user.last_name, user.is_banned ? 1 : 0],
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  async banUser(userId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE users SET is_banned = 1 WHERE id = ?',
        [userId],
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  async unbanUser(userId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE users SET is_banned = 0 WHERE id = ?',
        [userId],
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  async addFeedback(userId: number, message: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO feedback (user_id, message) VALUES (?, ?)',
        [userId, message],
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  async getFeedback(limit: number = 10, offset: number = 0): Promise<Feedback[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM feedback ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [limit, offset],
        (err, rows: any[]) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows.map(row => ({
              id: row.id,
              user_id: row.user_id,
              message: row.message,
              created_at: row.created_at,
              is_processed: Boolean(row.is_processed)
            })));
          }
        }
      );
    });
  }

  async markFeedbackAsProcessed(feedbackId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE feedback SET is_processed = 1 WHERE id = ?',
        [feedbackId],
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  async getBannedUsers(): Promise<User[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM users WHERE is_banned = 1',
        [],
        (err, rows: any[]) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows.map(row => ({
              id: row.id,
              username: row.username,
              first_name: row.first_name,
              last_name: row.last_name,
              is_banned: Boolean(row.is_banned),
              created_at: row.created_at
            })));
          }
        }
      );
    });
  }

  close(): void {
    this.db.close();
  }
}

