import { Database } from "bun:sqlite";

export interface PlayHistoryRecord {
  id?: number;
  username: string;
  filename: string;
  category: string;
  name: string;
  timestamp: number;
  created_at?: string;
}

class PlayHistoryDatabase {
  private db: Database;

  constructor() {
    // Create an in-memory SQLite database
    this.db = new Database(":memory:");
    this.initDatabase();
  }

  private initDatabase() {
    // Create play_history table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS play_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        filename TEXT NOT NULL,
        category TEXT NOT NULL,
        name TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;

    this.db.run(createTableQuery);

    // Create index for better query performance
    this.db.run("CREATE INDEX IF NOT EXISTS idx_username ON play_history(username);");
    this.db.run("CREATE INDEX IF NOT EXISTS idx_timestamp ON play_history(timestamp);");

    console.log("✅ Play history database initialized");
  }

  addPlayRecord(record: PlayHistoryRecord): void {
    const insertQuery = `
      INSERT INTO play_history (username, filename, category, name, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `;

    try {
      this.db.run(insertQuery, [
        record.username,
        record.filename,
        record.category,
        record.name,
        record.timestamp
      ]);

      console.log(`📝 Added play record: ${record.username} played ${record.name}`);
    } catch (error) {
      console.error("❌ Error adding play record:", error);
    }
  }

  getUserPlayHistory(username: string, limit: number = 50): PlayHistoryRecord[] {
    const query = `
      SELECT * FROM play_history
      WHERE username = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `;

    try {
      const stmt = this.db.prepare(query);
      const results = stmt.all(username, limit) as PlayHistoryRecord[];
      return results;
    } catch (error) {
      console.error("❌ Error fetching user play history:", error);
      return [];
    }
  }

  getAllPlayHistory(limit: number = 100): PlayHistoryRecord[] {
    const query = `
      SELECT * FROM play_history
      ORDER BY timestamp DESC
      LIMIT ?
    `;

    try {
      const stmt = this.db.prepare(query);
      const results = stmt.all(limit) as PlayHistoryRecord[];
      return results;
    } catch (error) {
      console.error("❌ Error fetching all play history:", error);
      return [];
    }
  }

  getTopUsers(limit: number = 10): Array<{ username: string; play_count: number }> {
    const query = `
      SELECT username, COUNT(*) as play_count
      FROM play_history
      GROUP BY username
      ORDER BY play_count DESC
      LIMIT ?
    `;

    try {
      const stmt = this.db.prepare(query);
      const results = stmt.all(limit) as Array<{ username: string; play_count: number }>;
      return results;
    } catch (error) {
      console.error("❌ Error fetching top users:", error);
      return [];
    }
  }

  getTopSounds(limit: number = 10): Array<{ name: string; filename: string; category: string; play_count: number }> {
    const query = `
      SELECT name, filename, category, COUNT(*) as play_count
      FROM play_history
      GROUP BY filename, category
      ORDER BY play_count DESC
      LIMIT ?
    `;

    try {
      const stmt = this.db.prepare(query);
      const results = stmt.all(limit) as Array<{ name: string; filename: string; category: string; play_count: number }>;
      return results;
    } catch (error) {
      console.error("❌ Error fetching top sounds:", error);
      return [];
    }
  }

  getPlayStats(): { total_plays: number; unique_users: number; unique_sounds: number } {
    try {
      const totalPlaysQuery = "SELECT COUNT(*) as total_plays FROM play_history";
      const uniqueUsersQuery = "SELECT COUNT(DISTINCT username) as unique_users FROM play_history";
      const uniqueSoundsQuery = "SELECT COUNT(DISTINCT filename || '-' || category) as unique_sounds FROM play_history";

      const totalPlays = (this.db.prepare(totalPlaysQuery).get() as { total_plays: number }).total_plays;
      const uniqueUsers = (this.db.prepare(uniqueUsersQuery).get() as { unique_users: number }).unique_users;
      const uniqueSounds = (this.db.prepare(uniqueSoundsQuery).get() as { unique_sounds: number }).unique_sounds;

      return {
        total_plays: totalPlays,
        unique_users: uniqueUsers,
        unique_sounds: uniqueSounds
      };
    } catch (error) {
      console.error("❌ Error fetching play stats:", error);
      return { total_plays: 0, unique_users: 0, unique_sounds: 0 };
    }
  }

  close(): void {
    this.db.close();
  }
}

// Export a singleton instance
export const playHistoryDb = new PlayHistoryDatabase();
