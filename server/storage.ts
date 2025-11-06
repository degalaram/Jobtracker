import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { users, jobs, tasks, notes, otpCodes, files, folders, type User, type Job, type Task, type Note, type File, type Folder, type InsertUser, type InsertJob, type InsertTask, type InsertNote, type InsertFile, type InsertFolder } from "@shared/schema";
import { eq, desc, and, gte } from "drizzle-orm";
import { randomUUID } from "crypto";
import { nanoid } from "nanoid";
import { autoFixDatabaseUrl } from "./auto-config"; // Assuming nanoid is available for generating IDs

neonConfig.webSocketConstructor = ws;
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineConnect = false;

// Setup Neon database connection with WebSocket polyfill
let db: ReturnType<typeof drizzle> | null = null;
let useInMemoryStorage = false;

try {
  const fixedDatabaseUrl = autoFixDatabaseUrl();

  if (fixedDatabaseUrl) {
    console.log('Attempting database connection...');
    const pool = new Pool({
      connectionString: fixedDatabaseUrl,
      ssl: fixedDatabaseUrl.includes('neon.tech') || fixedDatabaseUrl.includes('supabase.co')
        ? { rejectUnauthorized: false }
        : false,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
    });

    // Test the connection with better error handling
    pool.query('SELECT NOW()', (err, res) => {
      if (err) {
        console.error('❌ Database connection test failed:', err.message);
        console.error('Error details:', err);
        console.warn('⚠️  Falling back to in-memory storage - Data will be lost on restart!');
        useInMemoryStorage = true;
      } else {
        console.log('✅ Database connected successfully at:', res.rows[0].now);
        console.log('✅ Data will persist permanently in PostgreSQL');
      }
    });

    db = drizzle({ client: pool });
  } else {
    console.warn('WARNING: DATABASE_URL not set! Data will NOT persist. Please provision a database.');
    useInMemoryStorage = true;
  }
} catch (error) {
  console.error('Database connection failed:', error);
  console.warn('Using in-memory storage - Data will be lost on restart!');
  useInMemoryStorage = true;
}

// In-memory storage fallback
const memoryStore: {
  users: Map<string, User>;
  jobs: Map<string, Job>;
  tasks: Map<string, Task>;
  notes: Map<string, Note>;
  files: Map<string, File>;
  folders: Map<string, Folder>;
  otpCodes: Map<string, { identifier: string; otp: string; type: 'email' | 'phone'; expiresAt: Date }>;
} = {
  users: new Map(),
  jobs: new Map(),
  tasks: new Map(),
  notes: new Map(),
  files: new Map(),
  folders: new Map(),
  otpCodes: new Map(),
};

export interface IStorage {
  // Users
  createUser(user: InsertUser): Promise<User>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getOriginalPassword(userId: string): Promise<string | undefined>;
  updatePassword(userId: string, hashedPassword: string): Promise<boolean>;
  updatePasswordByEmail(email: string, hashedPassword: string): Promise<boolean>;
  updateUserInfo(userId: string, updates: { username?: string; email?: string; phone?: string }): Promise<boolean>;
  deleteUser(userId: string): Promise<boolean>;

  // OTP
  storeOtp(identifier: string, otp: string, type: 'email' | 'phone'): Promise<void>;
  verifyOtp(identifier: string, otp: string, type: 'email' | 'phone'): Promise<boolean>;
  deleteOtp(identifier: string, type: 'email' | 'phone'): Promise<void>;


  // Jobs
  getAllJobs(userId: string): Promise<Job[]>;
  createJob(job: InsertJob): Promise<Job>;
  updateJob(id: string, job: Partial<InsertJob>): Promise<Job | undefined>;
  deleteJob(id: string): Promise<boolean>;

  // Tasks
  getAllTasks(userId: string): Promise<Task[]>;
  getTasksSince(userId: string, since: string): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, task: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: string): Promise<boolean>;

  // Notes
  getAllNotes(userId: string): Promise<Note[]>;
  createNote(noteData: InsertNote): Promise<Note>;
  updateNote(id: string, noteData: Partial<InsertNote>): Promise<Note | undefined>;
  deleteNote(id: string): Promise<boolean>;

  // Files
  getAllFiles(userId: string): Promise<File[]>;
  getFileById(id: string): Promise<File | undefined>;
  createFile(fileData: InsertFile): Promise<File>;
  updateFile(id: string, fileData: Partial<InsertFile>): Promise<File | undefined>;
  deleteFile(id: string): Promise<boolean>;

  // Folders
  getAllFolders(userId: string): Promise<Folder[]>;
  getFolderById(id: string): Promise<Folder | undefined>;
  createFolder(folderData: InsertFolder): Promise<Folder>;
  updateFolder(id: string, folderData: Partial<InsertFolder>): Promise<Folder | undefined>;
  deleteFolder(id: string): Promise<boolean>;

  // Quota tracking
  getUserQuota(userId: string): Promise<number>;
  incrementUserQuota(userId: string): Promise<void>;
  resetUserQuota(userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  private db = db; // Use the initialized db instance
  private useInMemoryStorage = useInMemoryStorage; // Use the initialized flag
  private otpStore = memoryStore.otpCodes; // Alias for in-memory OTP storage

  // Quota tracking (in-memory, resets on logout or server restart)
  private userQuotas: Map<string, number> = new Map()

  // Users
  async createUser(user: InsertUser): Promise<User> {
    if (!this.db || this.useInMemoryStorage) {
      const newUser: User = {
        id: randomUUID(),
        username: user.username,
        email: user.email,
        phone: user.phone ?? '',
        password: user.password
      };
      memoryStore.users.set(newUser.id, newUser);
      console.log("User created in memory:", { id: newUser.id, username: newUser.username });
      return newUser;
    }

    try {
      console.log("Inserting user into database:", { username: user.username, email: user.email });
      const [newUser] = await this.db.insert(users).values(user).returning();
      console.log("User inserted successfully:", { id: newUser.id, username: newUser.username });
      return newUser;
    } catch (error: any) {
      console.error("Database error creating user, falling back to memory:", error);
      this.useInMemoryStorage = true;
      const newUser: User = {
        id: randomUUID(),
        username: user.username,
        email: user.email,
        phone: user.phone ?? '',
        password: user.password
      };
      memoryStore.users.set(newUser.id, newUser);
      return newUser;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    if (!this.db || this.useInMemoryStorage) {
      return Array.from(memoryStore.users.values()).find(u => u.username === username);
    }

    try {
      const [user] = await this.db.select().from(users).where(eq(users.username, username));
      return user;
    } catch (error) {
      console.error("Database error getting user, falling back to memory:", error);
      this.useInMemoryStorage = true;
      return Array.from(memoryStore.users.values()).find(u => u.username === username);
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    if (!this.db || this.useInMemoryStorage) {
      return Array.from(memoryStore.users.values()).find(u => u.email === email);
    }

    try {
      const [user] = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
      return user;
    } catch (error) {
      console.error("Database error getting user by email, falling back to memory:", error);
      this.useInMemoryStorage = true;
      return Array.from(memoryStore.users.values()).find(u => u.email === email);
    }
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    if (!this.db || this.useInMemoryStorage) {
      return Array.from(memoryStore.users.values()).find(u => u.phone === phone);
    }

    try {
      const [user] = await this.db.select().from(users).where(eq(users.phone, phone)).limit(1);
      return user;
    } catch (error) {
      console.error("Database error getting user by phone, falling back to memory:", error);
      this.useInMemoryStorage = true;
      return Array.from(memoryStore.users.values()).find(u => u.phone === phone);
    }
  }

  async getUserById(id: string): Promise<User | undefined> {
    if (!this.db || this.useInMemoryStorage) {
      return memoryStore.users.get(id);
    }

    try {
      const [user] = await this.db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error("Database error getting user, falling back to memory:", error);
      this.useInMemoryStorage = true;
      return memoryStore.users.get(id);
    }
  }

  async getOriginalPassword(userId: string): Promise<string | undefined> {
    return undefined;
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<boolean> {
    console.log(`[Storage] Updating password for user ${userId}`);
    console.log(`[Storage] New hashed password: ${hashedPassword.substring(0, 10)}...`);
    
    if (!this.db || this.useInMemoryStorage) {
      const user = memoryStore.users.get(userId);
      if (!user) {
        console.log("[Storage] User not found in memory for password update:", userId);
        return false;
      }
      console.log(`[Storage] Old password hash: ${user.password.substring(0, 10)}...`);
      user.password = hashedPassword;
      memoryStore.users.set(userId, user);
      console.log("[Storage] Updated password in memory for user:", userId);
      console.log(`[Storage] Verification - stored password: ${memoryStore.users.get(userId)?.password.substring(0, 10)}...`);
      return true;
    }

    try {
      console.log("[Storage] Updating password in database...");
      const result = await this.db.update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, userId))
        .returning();

      if (result.length > 0) {
        console.log("[Storage] Database update successful, result:", result[0].password.substring(0, 10) + '...');
        console.log("[Storage] Updated password in database for user:", userId);
        return true;
      }
      console.log("[Storage] No user found in database for password update:", userId);
      return false;
    } catch (error) {
      console.error("[Storage] Database error updating password, falling back to memory:", error);
      this.useInMemoryStorage = true;
      const user = memoryStore.users.get(userId);
      if (!user) {
        console.log("[Storage] User not found in memory fallback for password update:", userId);
        return false;
      }
      user.password = hashedPassword;
      memoryStore.users.set(userId, user);
      console.log("[Storage] Updated password in memory (fallback) for user:", userId);
      return true;
    }
  }

  

  async updateUserInfo(userId: string, updates: { username?: string; email?: string; phone?: string }): Promise<boolean> {
    if (!this.db || this.useInMemoryStorage) {
      const user = memoryStore.users.get(userId);
      if (!user) return false;
      
      if (updates.username !== undefined) user.username = updates.username;
      if (updates.email !== undefined) user.email = updates.email;
      if (updates.phone !== undefined) user.phone = updates.phone;
      
      memoryStore.users.set(userId, user);
      console.log("Updated user info in memory for user:", userId);
      return true;
    }

    try {
      const updateData: any = {};
      if (updates.username !== undefined) updateData.username = updates.username;
      if (updates.email !== undefined) updateData.email = updates.email;
      if (updates.phone !== undefined) updateData.phone = updates.phone;

      const result = await this.db.update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning();

      if (result.length > 0) {
        console.log("Updated user info in database for user:", userId);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Database error updating user info, falling back to memory:", error);
      this.useInMemoryStorage = true;
      const user = memoryStore.users.get(userId);
      if (!user) return false;
      
      if (updates.username !== undefined) user.username = updates.username;
      if (updates.email !== undefined) user.email = updates.email;
      if (updates.phone !== undefined) user.phone = updates.phone;
      
      memoryStore.users.set(userId, user);
      console.log("Updated user info in memory (fallback) for user:", userId);
      return true;
    }
  }

  async updatePasswordByEmail(email: string, hashedPassword: string): Promise<boolean> {
    if (!this.db || this.useInMemoryStorage) {
      const user = Array.from(memoryStore.users.values()).find(u => u.email === email);
      if (user) {
        user.password = hashedPassword;
        return true;
      }
      return false;
    }

    try {
      // Check if user exists first
      const existingUser = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
      if (!existingUser || existingUser.length === 0) {
        console.log(`User with email ${email} not found in database`);
        return false;
      }

      await this.db.update(users)
        .set({ password: hashedPassword })
        .where(eq(users.email, email));

      return true;
    } catch (error) {
      console.error("Database error updating password by email, falling back to memory:", error);
      this.useInMemoryStorage = true;
      const user = Array.from(memoryStore.users.values()).find(u => u.email === email);
      if (user) {
        user.password = hashedPassword;
        return true;
      }
      return false;
    }
  }

  async deleteUser(userId: string): Promise<boolean> {
    // Delete from memory storage
    if (!this.db || this.useInMemoryStorage) {
      // Check if user exists
      if (!memoryStore.users.has(userId)) {
        console.log(`User ${userId} not found in memory`);
        return false;
      }

      // Delete all user's jobs
      const userJobs = Array.from(memoryStore.jobs.values()).filter(job => job.userId === userId);
      userJobs.forEach(job => memoryStore.jobs.delete(job.id));

      // Delete all user's tasks
      const userTasks = Array.from(memoryStore.tasks.values()).filter(task => task.userId === userId);
      userTasks.forEach(task => memoryStore.tasks.delete(task.id));

      // Delete all user's notes
      const userNotes = Array.from(memoryStore.notes.values()).filter(note => note.userId === userId);
      userNotes.forEach(note => memoryStore.notes.delete(note.id));

      // Delete user
      const deleted = memoryStore.users.delete(userId);
      console.log(`User ${userId} and all associated data deleted from memory`);
      return deleted;
    }

    try {
      // Check if user exists first
      const existingUser = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!existingUser || existingUser.length === 0) {
        console.log(`User ${userId} not found in database`);
        return false;
      }

      // Delete all user's jobs
      await this.db.delete(jobs).where(eq(jobs.userId, userId));

      // Delete all user's tasks
      await this.db.delete(tasks).where(eq(tasks.userId, userId));

      // Delete all user's notes
      await this.db.delete(notes).where(eq(notes.userId, userId));

      // Delete user
      await this.db.delete(users).where(eq(users.id, userId));

      console.log(`User ${userId} and all associated data deleted from database`);
      return true;
    } catch (error) {
      console.error("Database error deleting user, falling back to memory:", error);
      this.useInMemoryStorage = true;

      // Check if user exists
      if (!memoryStore.users.has(userId)) {
        console.log(`User ${userId} not found in memory`);
        return false;
      }

      // Delete all user's jobs
      const userJobs = Array.from(memoryStore.jobs.values()).filter(job => job.userId === userId);
      userJobs.forEach(job => memoryStore.jobs.delete(job.id));

      // Delete all user's tasks
      const userTasks = Array.from(memoryStore.tasks.values()).filter(task => task.userId === userId);
      userTasks.forEach(task => memoryStore.tasks.delete(task.id));

      // Delete all user's notes
      const userNotes = Array.from(memoryStore.notes.values()).filter(note => note.userId === userId);
      userNotes.forEach(note => memoryStore.notes.delete(note.id));

      // Delete user
      return memoryStore.users.delete(userId);
    }
  }

  // OTP Storage Methods
  async storeOtp(identifier: string, otp: string, type: 'email' | 'phone'): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      if (this.db) {
        try {
          // Delete any existing OTP for this identifier
          await this.db.delete(otpCodes)
            .where(
              and(
                eq(otpCodes.identifier, identifier),
                eq(otpCodes.type, type)
              )
            );

          // Insert new OTP
          await this.db.insert(otpCodes).values({
            identifier,
            otp,
            type,
            expiresAt,
          });
          console.log(`OTP stored in database for ${identifier} (${type})`);
          return;
        } catch (dbError) {
          console.error('Database error storing OTP, using memory fallback:', dbError);
        }
      }

      // In-memory fallback
      this.otpStore.set(`${identifier}:${type}`, { identifier, otp, type, expiresAt });
      console.log(`OTP stored in memory for ${identifier} (${type})`);
    } catch (error) {
      console.error('Error storing OTP:', error);
      // Fallback to in-memory
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      this.otpStore.set(`${identifier}:${type}`, { identifier, otp, type, expiresAt });
      console.log(`OTP stored in memory for ${identifier} (${type})`);
    }
  }

  async verifyOtp(identifier: string, otp: string, type: 'email' | 'phone'): Promise<boolean> {
    try {
      if (this.db) {
        try {
          const result = await this.db.select()
            .from(otpCodes)
            .where(
              and(
                eq(otpCodes.identifier, identifier),
                eq(otpCodes.type, type),
                eq(otpCodes.otp, otp)
              )
            )
            .limit(1);

          if (result.length > 0) {
            const otpRecord = result[0];
            // Check if OTP is expired
            if (new Date() > otpRecord.expiresAt) {
              await this.deleteOtp(identifier, type);
              console.log(`OTP expired for ${identifier} (${type})`);
              return false;
            }
            console.log(`OTP verified successfully for ${identifier} (${type})`);
            return true;
          }
          console.log(`No OTP found in database for ${identifier} (${type}), checking memory`);
        } catch (dbError) {
          console.error('Database error verifying OTP, checking memory fallback:', dbError);
        }
      }

      // In-memory fallback
      const stored = this.otpStore.get(`${identifier}:${type}`);
      if (!stored) {
        console.log(`No OTP found in memory for ${identifier} (${type})`);
        return false;
      }

      if (new Date() > stored.expiresAt) {
        this.otpStore.delete(`${identifier}:${type}`);
        console.log(`OTP expired in memory for ${identifier} (${type})`);
        return false;
      }

      const isValid = stored.otp === otp;
      console.log(`OTP ${isValid ? 'verified' : 'invalid'} in memory for ${identifier} (${type})`);
      return isValid;
    } catch (error) {
      console.error('Error verifying OTP:', error);
      return false;
    }
  }

  async deleteOtp(identifier: string, type: 'email' | 'phone'): Promise<void> {
    if (!this.db || this.useInMemoryStorage) {
      memoryStore.otpCodes.delete(`${identifier}-${type}`);
      return;
    }

    try {
      await this.db
        .delete(otpCodes)
        .where(
          and(
            eq(otpCodes.identifier, identifier),
            eq(otpCodes.type, type)
          )
        );
    } catch (error) {
      console.error("Database error deleting OTP, falling back to memory:", error);
      this.useInMemoryStorage = true;
      memoryStore.otpCodes.delete(`${identifier}-${type}`);
    }
  }


  // Jobs
  async getAllJobs(userId: string = 'default-user'): Promise<Job[]> {
    if (!this.db || this.useInMemoryStorage) {
      return Array.from(memoryStore.jobs.values())
        .filter(j => j.userId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    try {
      return await this.db.select().from(jobs).where(eq(jobs.userId, userId)).orderBy(desc(jobs.createdAt));
    } catch (error) {
      console.error("Database error, using memory:", error);
      this.useInMemoryStorage = true;
      return Array.from(memoryStore.jobs.values())
        .filter(j => j.userId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
  }

  async createJob(job: InsertJob): Promise<Job> {
    if (!this.db || this.useInMemoryStorage) {
      const newJob: Job = {
        ...job,
        id: randomUUID(),
        userId: job.userId || 'default-user',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      memoryStore.jobs.set(newJob.id, newJob);
      return newJob;
    }

    try {
      const [newJob] = await this.db.insert(jobs).values(job).returning();
      return newJob;
    } catch (error) {
      console.error("Database error, using memory:", error);
      this.useInMemoryStorage = true;
      const newJob: Job = {
        ...job,
        id: randomUUID(),
        userId: job.userId || 'default-user',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      memoryStore.jobs.set(newJob.id, newJob);
      return newJob;
    }
  }

  async updateJob(id: string, jobUpdate: Partial<InsertJob>): Promise<Job | undefined> {
    if (!this.db || this.useInMemoryStorage) {
      const job = memoryStore.jobs.get(id);
      if (!job) return undefined;
      const updated = { ...job, ...jobUpdate, updatedAt: new Date() };
      memoryStore.jobs.set(id, updated);
      return updated;
    }

    try {
      const [updated] = await this.db.update(jobs)
        .set({ ...jobUpdate, updatedAt: new Date() })
        .where(eq(jobs.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error("Database error, using memory:", error);
      this.useInMemoryStorage = true;
      const job = memoryStore.jobs.get(id);
      if (!job) return undefined;
      const updated = { ...job, ...jobUpdate, updatedAt: new Date() };
      memoryStore.jobs.set(id, updated);
      return updated;
    }
  }

  async deleteJob(id: string): Promise<boolean> {
    if (!this.db || this.useInMemoryStorage) {
      return memoryStore.jobs.delete(id);
    }

    try {
      const result = await this.db.delete(jobs).where(eq(jobs.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error("Database error, using memory:", error);
      this.useInMemoryStorage = true;
      return memoryStore.jobs.delete(id);
    }
  }

  // Tasks
  async getAllTasks(userId: string = 'default-user'): Promise<Task[]> {
    if (!this.db || this.useInMemoryStorage) {
      return Array.from(memoryStore.tasks.values())
        .filter(t => t.userId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    try {
      return await this.db.select().from(tasks).where(eq(tasks.userId, userId)).orderBy(desc(tasks.createdAt));
    } catch (error) {
      console.error("Database error, using memory:", error);
      this.useInMemoryStorage = true;
      return Array.from(memoryStore.tasks.values())
        .filter(t => t.userId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
  }

  async getTasksSince(userId: string = 'default-user', since: string): Promise<Task[]> {
    const sinceDate = new Date(since);

    if (!this.db || this.useInMemoryStorage) {
      return Array.from(memoryStore.tasks.values())
        .filter(t => t.userId === userId && t.createdAt >= sinceDate)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    try {
      return await this.db.select().from(tasks)
        .where(and(eq(tasks.userId, userId), gte(tasks.createdAt, sinceDate)))
        .orderBy(desc(tasks.createdAt));
    } catch (error) {
      console.error("Database error, using memory:", error);
      this.useInMemoryStorage = true;
      return Array.from(memoryStore.tasks.values())
        .filter(t => t.userId === userId && t.createdAt >= sinceDate)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
  }

  async createTask(task: InsertTask): Promise<Task> {
    if (!this.db || this.useInMemoryStorage) {
      const newTask: Task = {
        ...task,
        id: randomUUID(),
        userId: task.userId || 'default-user',
        url: task.url ?? null,
        completed: task.completed ?? false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      memoryStore.tasks.set(newTask.id, newTask);
      return newTask;
    }

    try {
      const [newTask] = await this.db.insert(tasks).values(task).returning();
      return newTask;
    } catch (error) {
      console.error("Database error, using memory:", error);
      this.useInMemoryStorage = true;
      const newTask: Task = {
        ...task,
        id: randomUUID(),
        userId: task.userId || 'default-user',
        url: task.url ?? null,
        completed: task.completed ?? false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      memoryStore.tasks.set(newTask.id, newTask);
      return newTask;
    }
  }

  async updateTask(id: string, taskUpdate: Partial<InsertTask>): Promise<Task | undefined> {
    if (!this.db || this.useInMemoryStorage) {
      const task = memoryStore.tasks.get(id);
      if (!task) return undefined;
      const updated = { ...task, ...taskUpdate, updatedAt: new Date() };
      memoryStore.tasks.set(id, updated);
      return updated;
    }

    try {
      const [updated] = await this.db.update(tasks)
        .set({ ...taskUpdate, updatedAt: new Date() })
        .where(eq(tasks.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error("Database error, using memory:", error);
      this.useInMemoryStorage = true;
      const task = memoryStore.tasks.get(id);
      if (!task) return undefined;
      const updated = { ...task, ...taskUpdate, updatedAt: new Date() };
      memoryStore.tasks.set(id, updated);
      return updated;
    }
  }

  async deleteTask(id: string): Promise<boolean> {
    if (!this.db || this.useInMemoryStorage) {
      return memoryStore.tasks.delete(id);
    }

    try {
      const result = await this.db.delete(tasks).where(eq(tasks.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error("Database error, using memory:", error);
      this.useInMemoryStorage = true;
      return memoryStore.tasks.delete(id);
    }
  }

  // Notes
  async getAllNotes(userId: string = 'default-user'): Promise<Note[]> {
    if (!this.db || this.useInMemoryStorage) {
      return Array.from(memoryStore.notes.values())
        .filter(n => n.userId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    try {
      const result = await this.db
        .select()
        .from(notes)
        .where(eq(notes.userId, userId))
        .orderBy(desc(notes.createdAt));
      return result;
    } catch (error) {
      console.error("Database error, using memory:", error);
      this.useInMemoryStorage = true;
      return Array.from(memoryStore.notes.values())
        .filter(n => n.userId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
  }

  async createNote(noteData: InsertNote): Promise<Note> {
    if (!this.db || this.useInMemoryStorage) {
      const newNote: Note = {
        ...noteData,
        id: randomUUID(),
        userId: noteData.userId || 'default-user',
        title: noteData.title || '',
        content: noteData.content || '',
        color: noteData.color || '#ffffff',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      memoryStore.notes.set(newNote.id, newNote);
      return newNote;
    }

    try {
      const created = await this.db
        .insert(notes)
        .values(noteData)
        .returning();
      return created[0];
    } catch (error) {
      console.error("Database error, using memory:", error);
      this.useInMemoryStorage = true;
      const newNote: Note = {
        ...noteData,
        id: randomUUID(),
        userId: noteData.userId || 'default-user',
        title: noteData.title || '',
        content: noteData.content || '',
        color: noteData.color || '#ffffff',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      memoryStore.notes.set(newNote.id, newNote);
      return newNote;
    }
  }

  async updateNote(id: string, noteData: Partial<InsertNote>): Promise<Note | undefined> {
    if (!this.db || this.useInMemoryStorage) {
      const existing = memoryStore.notes.get(id);
      if (!existing) return undefined;
      const updated: Note = {
        ...existing,
        ...noteData,
        updatedAt: new Date()
      };
      memoryStore.notes.set(id, updated);
      return updated;
    }

    try {
      const result = await this.db
        .update(notes)
        .set({ ...noteData, updatedAt: new Date() })
        .where(eq(notes.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error("Database error, using memory:", error);
      this.useInMemoryStorage = true;
      const existing = memoryStore.notes.get(id);
      if (!existing) return undefined;
      const updated: Note = {
        ...existing,
        ...noteData,
        updatedAt: new Date()
      };
      memoryStore.notes.set(id, updated);
      return updated;
    }
  }

  async deleteNote(id: string): Promise<boolean> {
    if (!this.db || this.useInMemoryStorage) {
      return memoryStore.notes.delete(id);
    }

    try {
      const result = await this.db
        .delete(notes)
        .where(eq(notes.id, id))
        .returning();
      return result.length > 0;
    } catch (error) {
      console.error("Database error, using memory:", error);
      this.useInMemoryStorage = true;
      return memoryStore.notes.delete(id);
    }
  }

  async getAllFiles(userId: string): Promise<File[]> {
    if (!this.db || this.useInMemoryStorage) {
      return Array.from(memoryStore.files.values())
        .filter(f => f.userId === userId && !f.isTrashed)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    try {
      const result = await this.db
        .select()
        .from(files)
        .where(and(eq(files.userId, userId), eq(files.isTrashed, false)))
        .orderBy(desc(files.createdAt));
      return result;
    } catch (error) {
      console.error("Database error, using memory:", error);
      this.useInMemoryStorage = true;
      return Array.from(memoryStore.files.values())
        .filter(f => f.userId === userId && !f.isTrashed)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
  }

  async getFileById(id: string): Promise<File | undefined> {
    if (!this.db || this.useInMemoryStorage) {
      return memoryStore.files.get(id);
    }

    try {
      const result = await this.db
        .select()
        .from(files)
        .where(eq(files.id, id))
        .limit(1);
      return result[0];
    } catch (error) {
      console.error("Database error, using memory:", error);
      this.useInMemoryStorage = true;
      return memoryStore.files.get(id);
    }
  }

  async createFile(fileData: InsertFile): Promise<File> {
    if (!this.db || this.useInMemoryStorage) {
      const newFile: File = {
        ...fileData,
        id: randomUUID(),
        userId: fileData.userId || 'default-user',
        folderId: fileData.folderId || null,
        isTrashed: false,
        trashedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      memoryStore.files.set(newFile.id, newFile);
      return newFile;
    }

    try {
      const created = await this.db
        .insert(files)
        .values(fileData)
        .returning();
      return created[0];
    } catch (error) {
      console.error("Database error, using memory:", error);
      this.useInMemoryStorage = true;
      const newFile: File = {
        ...fileData,
        id: randomUUID(),
        userId: fileData.userId || 'default-user',
        folderId: fileData.folderId || null,
        isTrashed: false,
        trashedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      memoryStore.files.set(newFile.id, newFile);
      return newFile;
    }
  }

  async updateFile(id: string, fileData: Partial<InsertFile>): Promise<File | undefined> {
    if (!this.db || this.useInMemoryStorage) {
      const existing = memoryStore.files.get(id);
      if (!existing) return undefined;
      const updated: File = {
        ...existing,
        ...fileData,
        updatedAt: new Date()
      };
      memoryStore.files.set(id, updated);
      return updated;
    }

    try {
      const result = await this.db
        .update(files)
        .set({ ...fileData, updatedAt: new Date() })
        .where(eq(files.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error("Database error, using memory:", error);
      this.useInMemoryStorage = true;
      const existing = memoryStore.files.get(id);
      if (!existing) return undefined;
      const updated: File = {
        ...existing,
        ...fileData,
        updatedAt: new Date()
      };
      memoryStore.files.set(id, updated);
      return updated;
    }
  }

  async deleteFile(id: string): Promise<boolean> {
    if (!this.db || this.useInMemoryStorage) {
      const file = memoryStore.files.get(id);
      if (file) {
        file.isTrashed = true;
        file.trashedAt = new Date();
        memoryStore.files.set(id, file);
        return true;
      }
      return false;
    }

    try {
      const result = await this.db
        .update(files)
        .set({ isTrashed: true, trashedAt: new Date() })
        .where(eq(files.id, id))
        .returning();
      return result.length > 0;
    } catch (error) {
      console.error("Database error, using memory:", error);
      this.useInMemoryStorage = true;
      const file = memoryStore.files.get(id);
      if (file) {
        file.isTrashed = true;
        file.trashedAt = new Date();
        memoryStore.files.set(id, file);
        return true;
      }
      return false;
    }
  }

  async getAllFolders(userId: string): Promise<Folder[]> {
    if (!this.db || this.useInMemoryStorage) {
      return Array.from(memoryStore.folders.values())
        .filter(f => f.userId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    try {
      const result = await this.db
        .select()
        .from(folders)
        .where(eq(folders.userId, userId))
        .orderBy(desc(folders.createdAt));
      return result;
    } catch (error) {
      console.error("Database error, using memory:", error);
      this.useInMemoryStorage = true;
      return Array.from(memoryStore.folders.values())
        .filter(f => f.userId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
  }

  async getFolderById(id: string): Promise<Folder | undefined> {
    if (!this.db || this.useInMemoryStorage) {
      return memoryStore.folders.get(id);
    }

    try {
      const result = await this.db
        .select()
        .from(folders)
        .where(eq(folders.id, id))
        .limit(1);
      return result[0];
    } catch (error) {
      console.error("Database error, using memory:", error);
      this.useInMemoryStorage = true;
      return memoryStore.folders.get(id);
    }
  }

  async createFolder(folderData: InsertFolder): Promise<Folder> {
    if (!this.db || this.useInMemoryStorage) {
      const newFolder: Folder = {
        ...folderData,
        id: randomUUID(),
        userId: folderData.userId || 'default-user',
        parentId: folderData.parentId || null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      memoryStore.folders.set(newFolder.id, newFolder);
      return newFolder;
    }

    try {
      const created = await this.db
        .insert(folders)
        .values(folderData)
        .returning();
      return created[0];
    } catch (error) {
      console.error("Database error, using memory:", error);
      this.useInMemoryStorage = true;
      const newFolder: Folder = {
        ...folderData,
        id: randomUUID(),
        userId: folderData.userId || 'default-user',
        parentId: folderData.parentId || null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      memoryStore.folders.set(newFolder.id, newFolder);
      return newFolder;
    }
  }

  async updateFolder(id: string, folderData: Partial<InsertFolder>): Promise<Folder | undefined> {
    if (!this.db || this.useInMemoryStorage) {
      const existing = memoryStore.folders.get(id);
      if (!existing) return undefined;
      const updated: Folder = {
        ...existing,
        ...folderData,
        updatedAt: new Date()
      };
      memoryStore.folders.set(id, updated);
      return updated;
    }

    try {
      const result = await this.db
        .update(folders)
        .set({ ...folderData, updatedAt: new Date() })
        .where(eq(folders.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error("Database error, using memory:", error);
      this.useInMemoryStorage = true;
      const existing = memoryStore.folders.get(id);
      if (!existing) return undefined;
      const updated: Folder = {
        ...existing,
        ...folderData,
        updatedAt: new Date()
      };
      memoryStore.folders.set(id, updated);
      return updated;
    }
  }

  async deleteFolder(id: string): Promise<boolean> {
    if (!this.db || this.useInMemoryStorage) {
      return memoryStore.folders.delete(id);
    }

    try {
      const result = await this.db
        .delete(folders)
        .where(eq(folders.id, id))
        .returning();
      return result.length > 0;
    } catch (error) {
      console.error("Database error, using memory:", error);
      this.useInMemoryStorage = true;
      return memoryStore.folders.delete(id);
    }
  }

  async getUserQuota(userId: string): Promise<number> {
    return this.userQuotas.get(userId) || 0
  }

  async incrementUserQuota(userId: string): Promise<void> {
    const current = this.userQuotas.get(userId) || 0
    this.userQuotas.set(userId, current + 1)
  }

  async resetUserQuota(userId: string): Promise<void> {
    this.userQuotas.delete(userId)
  }

  }

export const storage = new DatabaseStorage();
