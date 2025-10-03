export interface User {
  id: number;
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  is_banned: boolean;
  created_at: string;
}

export interface Feedback {
  id: number;
  user_id: number;
  message: string;
  created_at: string;
  is_processed: boolean;
  is_spam: boolean;
}

export interface DatabaseConfig {
  path: string;
}

export interface BotConfig {
  token: string;
  adminUserId: number;
  databasePath: string;
}

