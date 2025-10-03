import initSqlJs from 'sql.js';
import { User, Feedback, DatabaseConfig } from './types';
import * as fs from 'fs';

export class Database {
  private db: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
    this.initDatabase();
  }

  private async initDatabase(): Promise<void> {
    const SQL = await initSqlJs();
    
    // Загружаем существующую базу данных или создаем новую
    if (fs.existsSync(this.config.path)) {
      const filebuffer = fs.readFileSync(this.config.path);
      this.db = new SQL.Database(filebuffer);
    } else {
      this.db = new SQL.Database();
    }
    
    this.initTables();
    this.saveDatabase();
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

  private saveDatabase(): void {
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(this.config.path, buffer);
  }

  getUser(userId: number): User | null {
    const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
    const result = stmt.getAsObject({ ':id': userId });
    if (!result || Object.keys(result).length === 0) return null;
    
    return {
      id: result.id as number,
      username: result.username as string,
      first_name: result.first_name as string,
      last_name: result.last_name as string,
      is_banned: Boolean(result.is_banned),
      created_at: result.created_at as string
    };
  }

  createUser(user: Omit<User, 'created_at'>): void {
    const stmt = this.db.prepare(
      'INSERT OR REPLACE INTO users (id, username, first_name, last_name, is_banned) VALUES (:id, :username, :first_name, :last_name, :is_banned)'
    );
    stmt.run({
      ':id': user.id,
      ':username': user.username,
      ':first_name': user.first_name,
      ':last_name': user.last_name,
      ':is_banned': user.is_banned ? 1 : 0
    });
    this.saveDatabase();
  }

  banUser(userId: number): void {
    const stmt = this.db.prepare('UPDATE users SET is_banned = 1 WHERE id = :id');
    stmt.run({ ':id': userId });
    this.saveDatabase();
  }

  unbanUser(userId: number): void {
    const stmt = this.db.prepare('UPDATE users SET is_banned = 0 WHERE id = :id');
    stmt.run({ ':id': userId });
    this.saveDatabase();
  }

  addFeedback(userId: number, message: string): void {
    const stmt = this.db.prepare('INSERT INTO feedback (user_id, message) VALUES (:user_id, :message)');
    stmt.run({ ':user_id': userId, ':message': message });
    this.saveDatabase();
  }

  getFeedback(limit: number = 10, offset: number = 0): Feedback[] {
    const stmt = this.db.prepare(
      'SELECT * FROM feedback ORDER BY created_at DESC LIMIT :limit OFFSET :offset'
    );
    const result = stmt.getAsObject({ ':limit': limit, ':offset': offset });
    
    if (!result || Object.keys(result).length === 0) return [];
    
    // sql.js возвращает один объект, нам нужно получить все записи
    const stmtAll = this.db.prepare(
      'SELECT * FROM feedback ORDER BY created_at DESC LIMIT :limit OFFSET :offset'
    );
    const rows: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
    while (stmtAll.step()) {
      rows.push(stmtAll.getAsObject());
    }
    
    return rows.map(row => ({
      id: row.id as number,
      user_id: row.user_id as number,
      message: row.message as string,
      created_at: row.created_at as string,
      is_processed: Boolean(row.is_processed)
    }));
  }

  markFeedbackAsProcessed(feedbackId: number): void {
    const stmt = this.db.prepare('UPDATE feedback SET is_processed = 1 WHERE id = :id');
    stmt.run({ ':id': feedbackId });
    this.saveDatabase();
  }

  getBannedUsers(): User[] {
    const stmt = this.db.prepare('SELECT * FROM users WHERE is_banned = 1');
    const rows: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    
    return rows.map(row => ({
      id: row.id as number,
      username: row.username as string,
      first_name: row.first_name as string,
      last_name: row.last_name as string,
      is_banned: Boolean(row.is_banned),
      created_at: row.created_at as string
    }));
  }

  close(): void {
    this.db.close();
  }
}

