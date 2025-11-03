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
    // Create a persistent SQLite database
    this.db = new Database("./data/play_history.db");
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
    this.db.run(
      "CREATE INDEX IF NOT EXISTS idx_username ON play_history(username);",
    );
    this.db.run(
      "CREATE INDEX IF NOT EXISTS idx_timestamp ON play_history(timestamp);",
    );

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
        record.timestamp,
      ]);

      console.log(
        `📝 Added play record: ${record.username} played ${record.name}`,
      );
    } catch (error) {
      console.error("❌ Error adding play record:", error);
    }
  }

  getUserPlayHistory(
    username: string,
    limit: number = 50,
  ): PlayHistoryRecord[] {
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

  getTopUsers(
    limit: number = 10,
  ): Array<{ username: string; play_count: number }> {
    const query = `
      SELECT username, COUNT(*) as play_count
      FROM play_history
      GROUP BY username
      ORDER BY play_count DESC
      LIMIT ?
    `;

    try {
      const stmt = this.db.prepare(query);
      const results = stmt.all(limit) as Array<{
        username: string;
        play_count: number;
      }>;
      return results;
    } catch (error) {
      console.error("❌ Error fetching top users:", error);
      return [];
    }
  }

  getTopSounds(
    limit: number = 10,
  ): Array<{
    name: string;
    filename: string;
    category: string;
    play_count: number;
  }> {
    const query = `
      SELECT name, filename, category, COUNT(*) as play_count
      FROM play_history
      GROUP BY filename, category
      ORDER BY play_count DESC
      LIMIT ?
    `;

    try {
      const stmt = this.db.prepare(query);
      const results = stmt.all(limit) as Array<{
        name: string;
        filename: string;
        category: string;
        play_count: number;
      }>;
      return results;
    } catch (error) {
      console.error("❌ Error fetching top sounds:", error);
      return [];
    }
  }

  getPlayStats(): {
    total_plays: number;
    unique_users: number;
    unique_sounds: number;
  } {
    try {
      const totalPlaysQuery =
        "SELECT COUNT(*) as total_plays FROM play_history";
      const uniqueUsersQuery =
        "SELECT COUNT(DISTINCT username) as unique_users FROM play_history";
      const uniqueSoundsQuery =
        "SELECT COUNT(DISTINCT filename || '-' || category) as unique_sounds FROM play_history";

      const totalPlays = (
        this.db.prepare(totalPlaysQuery).get() as { total_plays: number }
      ).total_plays;
      const uniqueUsers = (
        this.db.prepare(uniqueUsersQuery).get() as { unique_users: number }
      ).unique_users;
      const uniqueSounds = (
        this.db.prepare(uniqueSoundsQuery).get() as { unique_sounds: number }
      ).unique_sounds;

      return {
        total_plays: totalPlays,
        unique_users: uniqueUsers,
        unique_sounds: uniqueSounds,
      };
    } catch (error) {
      console.error("❌ Error fetching play stats:", error);
      return { total_plays: 0, unique_users: 0, unique_sounds: 0 };
    }
  }

  getPlayStatsForTimeRange(
    startTimestamp?: number,
    endTimestamp?: number,
  ): { total_plays: number; unique_users: number; unique_sounds: number } {
    try {
      let whereClause = "";
      const params: number[] = [];

      if (startTimestamp && endTimestamp) {
        whereClause = "WHERE timestamp >= ? AND timestamp <= ?";
        params.push(startTimestamp, endTimestamp);
      } else if (startTimestamp) {
        whereClause = "WHERE timestamp >= ?";
        params.push(startTimestamp);
      } else if (endTimestamp) {
        whereClause = "WHERE timestamp <= ?";
        params.push(endTimestamp);
      }

      const totalPlaysQuery = `SELECT COUNT(*) as total_plays FROM play_history ${whereClause}`;
      const uniqueUsersQuery = `SELECT COUNT(DISTINCT username) as unique_users FROM play_history ${whereClause}`;
      const uniqueSoundsQuery = `SELECT COUNT(DISTINCT filename || '-' || category) as unique_sounds FROM play_history ${whereClause}`;

      const totalPlays = (
        this.db.prepare(totalPlaysQuery).get(...params) as {
          total_plays: number;
        }
      ).total_plays;
      const uniqueUsers = (
        this.db.prepare(uniqueUsersQuery).get(...params) as {
          unique_users: number;
        }
      ).unique_users;
      const uniqueSounds = (
        this.db.prepare(uniqueSoundsQuery).get(...params) as {
          unique_sounds: number;
        }
      ).unique_sounds;

      return {
        total_plays: totalPlays,
        unique_users: uniqueUsers,
        unique_sounds: uniqueSounds,
      };
    } catch (error) {
      console.error("❌ Error fetching time-range play stats:", error);
      return { total_plays: 0, unique_users: 0, unique_sounds: 0 };
    }
  }

  getTopUsersForTimeRange(
    limit: number = 10,
    startTimestamp?: number,
    endTimestamp?: number,
  ): Array<{ username: string; play_count: number }> {
    try {
      let whereClause = "";
      const params: (number | string)[] = [];

      if (startTimestamp && endTimestamp) {
        whereClause = "WHERE timestamp >= ? AND timestamp <= ?";
        params.push(startTimestamp, endTimestamp);
      } else if (startTimestamp) {
        whereClause = "WHERE timestamp >= ?";
        params.push(startTimestamp);
      } else if (endTimestamp) {
        whereClause = "WHERE timestamp <= ?";
        params.push(endTimestamp);
      }

      params.push(limit);

      const query = `
        SELECT username, COUNT(*) as play_count
        FROM play_history
        ${whereClause}
        GROUP BY username
        ORDER BY play_count DESC
        LIMIT ?
      `;

      const stmt = this.db.prepare(query);
      const results = stmt.all(...params) as Array<{
        username: string;
        play_count: number;
      }>;
      return results;
    } catch (error) {
      console.error("❌ Error fetching top users for time range:", error);
      return [];
    }
  }

  getTopSoundsForTimeRange(
    limit: number = 10,
    startTimestamp?: number,
    endTimestamp?: number,
  ): Array<{
    name: string;
    filename: string;
    category: string;
    play_count: number;
  }> {
    try {
      let whereClause = "";
      const params: (number | string)[] = [];

      if (startTimestamp && endTimestamp) {
        whereClause = "WHERE timestamp >= ? AND timestamp <= ?";
        params.push(startTimestamp, endTimestamp);
      } else if (startTimestamp) {
        whereClause = "WHERE timestamp >= ?";
        params.push(startTimestamp);
      } else if (endTimestamp) {
        whereClause = "WHERE timestamp <= ?";
        params.push(endTimestamp);
      }

      params.push(limit);

      const query = `
        SELECT name, filename, category, COUNT(*) as play_count
        FROM play_history
        ${whereClause}
        GROUP BY filename, category
        ORDER BY play_count DESC
        LIMIT ?
      `;

      const stmt = this.db.prepare(query);
      const results = stmt.all(...params) as Array<{
        name: string;
        filename: string;
        category: string;
        play_count: number;
      }>;
      return results;
    } catch (error) {
      console.error("❌ Error fetching top sounds for time range:", error);
      return [];
    }
  }

  getHourlyPlayStats(): Array<{ hour: number; play_count: number }> {
    try {
      const query = `
        SELECT
          CAST(strftime('%H', datetime(timestamp / 1000, 'unixepoch')) AS INTEGER) as hour,
          COUNT(*) as play_count
        FROM play_history
        GROUP BY hour
        ORDER BY hour
      `;

      const stmt = this.db.prepare(query);
      const results = stmt.all() as Array<{ hour: number; play_count: number }>;

      // Fill in missing hours with 0
      const hourlyStats = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        play_count: 0,
      }));
      results.forEach((result) => {
        hourlyStats[result.hour].play_count = result.play_count;
      });

      return hourlyStats;
    } catch (error) {
      console.error("❌ Error fetching hourly play stats:", error);
      return Array.from({ length: 24 }, (_, i) => ({ hour: i, play_count: 0 }));
    }
  }

  getCategoryStats(): Array<{
    category: string;
    play_count: number;
    unique_sounds: number;
  }> {
    try {
      const query = `
        SELECT
          category,
          COUNT(*) as play_count,
          COUNT(DISTINCT filename) as unique_sounds
        FROM play_history
        GROUP BY category
        ORDER BY play_count DESC
      `;

      const stmt = this.db.prepare(query);
      const results = stmt.all() as Array<{
        category: string;
        play_count: number;
        unique_sounds: number;
      }>;
      return results;
    } catch (error) {
      console.error("❌ Error fetching category stats:", error);
      return [];
    }
  }

  getDailyPlayStats(
    days: number = 30,
  ): Array<{ date: string; play_count: number }> {
    try {
      const startTimestamp = Date.now() - days * 24 * 60 * 60 * 1000;

      const query = `
        SELECT
          date(datetime(timestamp / 1000, 'unixepoch')) as date,
          COUNT(*) as play_count
        FROM play_history
        WHERE timestamp >= ?
        GROUP BY date
        ORDER BY date
      `;

      const stmt = this.db.prepare(query);
      const results = stmt.all(startTimestamp) as Array<{
        date: string;
        play_count: number;
      }>;
      return results;
    } catch (error) {
      console.error("❌ Error fetching daily play stats:", error);
      return [];
    }
  }

  close(): void {
    this.db.close();
  }
}

// Export a singleton instance
export const playHistoryDb = new PlayHistoryDatabase();
