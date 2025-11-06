import type { Express, Request, Response } from "express"; // Added Response for type hinting
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { storage } from "./storage";
import { insertJobSchema, insertTaskSchema, insertNoteSchema, insertUserSchema, insertFileSchema, insertFolderSchema } from "@shared/schema";
import crypto from "crypto";
import { sendOTPEmail } from "./email";
import multer from 'multer'; // Import multer for file uploads
import { createRequire } from 'module'; // For CommonJS modules in ESM
import OpenAI from 'openai'; // Import OpenAI for AI integration (or adjust for Gemini)

// Import pdf-parse as CommonJS module
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

// --- AI Configuration ---
// Initialize OpenAI client only if API key is available
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// --- Multer Configuration ---
// Configure multer to store files in memory for processing (for resume analysis)
const storageEngine = multer.memoryStorage();
const upload = multer({ storage: storageEngine });

// Configure multer to store uploaded files on disk
const fileStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const fs = require('fs');
    const uploadDir = './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const fileUpload = multer({
  storage: fileStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and images are allowed.'));
    }
  }
});

// --- AI Analysis Function ---
// This function will be called by the API endpoint to analyze the resume
async function analyzeResumeWithAI(resumeText: string, jobDescription: string): Promise<any> {
  try {
    // --- Gemini API Call Example (Adjust for OpenAI if needed) ---
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured. Please set it in your environment variables.');
    }

    const prompt = `
      Analyze the following resume against the provided job description.
      Provide an ATS score (0-100) and highlight key matching skills and potential areas for improvement.

      Job Description:
      ${jobDescription}

      Resume:
      ${resumeText}

      Respond in JSON format with keys: "atsScore", "matchingSkills", "areasForImprovement".
    `;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API error response:', errorData);
      throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const aiResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiResponseText) {
      throw new Error('AI model returned no content.');
    }

    // Attempt to parse the JSON response from the AI
    try {
      const analysis = JSON.parse(aiResponseText);
      // Basic validation of the parsed JSON structure
      if (typeof analysis.atsScore !== 'number' || !Array.isArray(analysis.matchingSkills) || !Array.isArray(analysis.areasForImprovement)) {
        console.warn("AI response JSON structure is not as expected:", analysis);
        // Fallback if AI doesn't provide perfect JSON but provides text
        return {
          atsScore: -1, // Indicate score could not be determined
          matchingSkills: [],
          areasForImprovement: ["Could not parse AI response accurately. Please review raw output."],
          rawResponse: aiResponseText // Include raw response for debugging
        };
      }
      return analysis;
    } catch (jsonError) {
      console.error("Failed to parse AI response as JSON:", jsonError);
      console.error("Raw AI response:", aiResponseText);
      // Return raw response if JSON parsing fails
      return {
        atsScore: -1, // Indicate score could not be determined
        matchingSkills: [],
        areasForImprovement: ["Failed to parse AI analysis. Please review raw output."],
        rawResponse: aiResponseText // Include raw response for debugging
      };
    }

    // --- OpenAI API Call Example (If you prefer OpenAI) ---
    /*
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo", // Or another suitable model
      messages: [
        { role: "system", content: "You are an AI assistant that analyzes resumes for job applications." },
        { role: "user", content: `
          Analyze the following resume against the provided job description.
          Provide an ATS score (0-100) and highlight key matching skills and potential areas for improvement.

          Job Description:
          ${jobDescription}

          Resume:
          ${resumeText}

          Respond in JSON format with keys: "atsScore", "matchingSkills", "areasForImprovement".
        `}
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const aiResponseText = completion.choices[0]?.message?.content;
    if (!aiResponseText) {
      throw new Error('AI model returned no content.');
    }

    try {
      const analysis = JSON.parse(aiResponseText);
      // Basic validation of the parsed JSON structure
      if (typeof analysis.atsScore !== 'number' || !Array.isArray(analysis.matchingSkills) || !Array.isArray(analysis.areasForImprovement)) {
        console.warn("AI response JSON structure is not as expected:", analysis);
        return {
          atsScore: -1,
          matchingSkills: [],
          areasForImprovement: ["Could not parse AI response accurately. Please review raw output."],
          rawResponse: aiResponseText
        };
      }
      return analysis;
    } catch (jsonError) {
      console.error("Failed to parse AI response as JSON:", jsonError);
      console.error("Raw AI response:", aiResponseText);
      return {
        atsScore: -1,
        matchingSkills: [],
        areasForImprovement: ["Failed to parse AI analysis. Please review raw output."],
        rawResponse: aiResponseText
      };
    }
    */
  } catch (error) {
    console.error("Error in analyzeResumeWithAI:", error);
    throw error; // Re-throw to be caught by the API endpoint handler
  }
}


// Session types
declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

// Password hashing functions
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// Placeholder for bcrypt hash function - replace with actual implementation if needed
async function hash(password: string, saltRounds: number): Promise<string> {
  // In a real application, use a strong hashing library like bcrypt
  // For this example, we'll use the existing sha256 hash for consistency,
  // but acknowledge that bcrypt is preferred for production.
  console.warn("Using basic SHA256 for password hashing. For production, consider bcrypt.");
  return hashPassword(password); // Using the existing simple hash
}


function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export function registerRoutes(app: Express): Server {
  // Helper to get userId from session
  const getUserId = (req: Request): string => {
    if (!req.session.userId) {
      throw new Error('User not authenticated');
    }
    return req.session.userId;
  };

  // Middleware to check if user is authenticated
  const isAuthenticated = (req: Request, res: Response, next: Function) => {
    if (req.session.userId) {
      next();
    } else {
      res.status(401).json({ error: 'Unauthorized' });
    }
  };

  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  const broadcast = (event: string, data: any) => {
    const message = { event, data };
    const messageStr = JSON.stringify(message);
    console.log("Broadcasting:", event);

    // Broadcast immediately to all connected clients
    const clients = Array.from(wss.clients);
    clients.forEach((client) => {
      if (client.readyState === 1) {
        try {
          client.send(messageStr);
        } catch (error) {
          console.error("Error broadcasting:", error);
        }
      }
    });
  };

  wss.on("connection", (ws) => {
    console.log("WebSocket client connected");

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } catch (error) {
        console.error("Error handling WebSocket message:", error);
      }
    });

    ws.on("close", () => {
      console.log("WebSocket client disconnected");
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
  });

  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      console.log("Registration request body:", req.body);

      // Validate request body
      const userData = insertUserSchema.parse(req.body);
      console.log("Validated user data:", { username: userData.username, email: userData.email });

      // Check if email already exists
      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        console.log("Email already exists:", userData.email);
        return res.status(400).json({ error: "Email already exists" });
      }

      // Check if phone already exists
      const existingPhone = await storage.getUserByPhone(userData.phone);
      if (existingPhone) {
        console.log("Phone already exists:", userData.phone);
        return res.status(400).json({ error: "Phone number already exists" });
      }

      // Hash password and create user
      const hashedPassword = hashPassword(userData.password);
      console.log("Creating user with hashed password");

      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      console.log("User created successfully:", { id: user.id, username: user.username });

      // Set session - ensure we save it properly
      req.session.userId = user.id;
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error("Session save error:", err);
            reject(err);
          } else {
            console.log("Session saved successfully for user:", user.id);
            resolve();
          }
        });
      });

      return res.status(200).json({
        id: user.id,
        username: user.username,
        email: user.email
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      console.error("Error stack:", error.stack);

      // Handle Zod validation errors
      if (error.errors) {
        return res.status(400).json({
          error: "Invalid registration data",
          details: error.errors
        });
      }

      const errorMessage = error.message || "Registration failed";
      return res.status(500).json({ error: errorMessage });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      console.log("Login request body:", req.body);
      const { email, password } = req.body;

      // Find user by email only
      const user = await storage.getUserByEmail(email);

      if (!user) {
        console.log("User not found for email:", email);
        return res.status(401).json({ error: "Invalid email or password" });
      }

      console.log("User found:", user.username, "- Verifying password...");
      console.log("Stored password hash:", user.password.substring(0, 10) + '...');
      console.log("Login password:", password);
      console.log("Login password hash:", hashPassword(password).substring(0, 10) + '...');

      const passwordMatch = verifyPassword(password, user.password);
      console.log("Password verification result:", passwordMatch);

      if (!passwordMatch) {
        console.log("Invalid password for user:", user.username);
        console.log("Expected hash:", user.password);
        console.log("Provided hash:", hashPassword(password));
        return res.status(401).json({ error: "Invalid email or password" });
      }

      req.session.userId = user.id;
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error("Session save error:", err);
            reject(err);
          } else {
            console.log("Session saved successfully for user:", user.id);
            resolve();
          }
        });
      });

      console.log("Login successful for user:", user.username);
      return res.status(200).json({
        id: user.id,
        username: user.username,
        email: user.email
      });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    const userId = req.session.userId

    req.session.destroy(async (err) => {
      if (err) {
        res.status(500).json({ error: "Logout failed" });
        return;
      }

      // Reset user's quota on logout to allow fresh start on next login
      if (userId) {
        await storage.resetUserQuota(userId)
        console.log(`Reset quota for user ${userId} on logout`)
      }

      res.json({ success: true });
    });
  });

  // Delete Account
  app.delete("/api/auth/account", async (req, res) => {
    if (!req.session.userId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    try {
      const userId = req.session.userId;
      const deleted = await storage.deleteUser(userId);

      if (!deleted) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      // Destroy session after deleting account
      req.session.destroy((err) => {
        if (err) {
          console.error("Error destroying session after account deletion:", err);
        }
      });

      res.json({ success: true, message: "Account deleted successfully" });
    } catch (error) {
      console.error("Delete account error:", error);
      res.status(500).json({ error: "Failed to delete account" });
    }
  });

  app.get("/api/auth/check", (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.json({ authenticated: !!req.session.userId });
  });

  app.get("/api/auth/me", async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    if (!req.session.userId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    try {
      const user = await storage.getUserById(req.session.userId);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Forgot Password - Send OTP
  app.post("/api/auth/forgot-password/send-otp", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({ error: "Email is required" });
        return;
      }

      // Check if user exists
      const user = await storage.getUserByEmail(email);
      if (!user) {
        console.log(`Forgot password attempt for non-existent email: ${email}`);
        // Return error to help user realize they may have the wrong email
        res.status(404).json({
          error: "No account found with this email address. Please check your email and try again."
        });
        return;
      }

      // Generate 6-digit OTP only for registered users
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Store OTP with expiry (5 minutes)
      await storage.storeOtp(email, otp, 'email');

      // Send OTP via Nodemailer
      const emailSent = await sendOTPEmail(
        email,
        user.username,
        otp,
        'Password Reset OTP - Daily Tracker'
      );

      if (!emailSent) {
        // Email failed - return error WITHOUT logging OTP
        console.error(`Failed to send OTP email to ${email}`);
        console.error(`Email configuration issue detected`);
        console.error(`Please verify:`);
        console.error(`   1. GMAIL_USER and GMAIL_APP_PASSWORD are set in Secrets/Environment Variables`);
        console.error(`   2. Gmail App Password is correctly generated at: https://myaccount.google.com/apppasswords`);
        console.error(`   3. 2-Step Verification is enabled on your Google account`);

        res.status(500).json({
          error: "Failed to send OTP email. Please verify your email configuration is correct."
        });
        return;
      }

      console.log(`Password reset OTP sent successfully to ${email}`);

      res.json({
        success: true,
        message: "If this email is registered, you will receive an OTP"
      });
    } catch (error) {
      console.error("Send OTP error:", error);
      res.status(500).json({ error: "Failed to send OTP" });
    }
  });

  // Forgot Password - Verify OTP
  app.post("/api/auth/forgot-password/verify-otp", async (req, res) => {
    try {
      const { email, otp } = req.body;
      const isValid = await storage.verifyOtp(email, otp, 'email');

      if (!isValid) {
        res.status(400).json({ error: "Invalid or expired OTP" });
        return;
      }

      res.json({ success: true, message: "OTP verified" });
    } catch (error) {
      console.error("Verify OTP error:", error);
      res.status(500).json({ error: "Failed to verify OTP" });
    }
  });

  // Forgot Password - Reset Password
  app.post("/api/auth/forgot-password/reset", async (req, res) => {
    try {
      const { email, otp, password } = req.body;

      // Verify OTP one more time
      const isValid = await storage.verifyOtp(email, otp, 'email');
      if (!isValid) {
        res.status(400).json({ error: "Invalid or expired OTP" });
        return;
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const hashedPassword = hashPassword(password);
      await storage.updatePasswordByEmail(email, hashedPassword);
      await storage.deleteOtp(email, 'email');

      res.json({ success: true, message: "Password reset successful" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // Mobile Login - Send OTP (Email-based)
  app.post("/api/auth/mobile-login/send-otp", async (req, res) => {
    try {
      const { phone } = req.body;
      const user = await storage.getUserByPhone(phone);

      if (!user) {
        res.status(404).json({ error: "Phone number not registered" });
        return;
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Store OTP with expiry (5 minutes)
      await storage.storeOtp(phone, otp, 'phone');

      // Send OTP via Nodemailer to user's email
      if (user.email) {
        const emailSent = await sendOTPEmail(
          user.email,
          user.username,
          otp,
          'Mobile Login OTP - Daily Tracker'
        );

        if (!emailSent) {
          // Email failed - return error WITHOUT logging OTP
          console.error(`Failed to send mobile login OTP to ${user.email}`);
          console.error(`Email configuration issue detected`);
          console.error(`Please verify:`);
          console.error(`   1. GMAIL_USER and GMAIL_APP_PASSWORD are set in Secrets/Environment Variables`);
          console.error(`   2. Gmail App Password is correctly generated at: https://myaccount.google.com/apppasswords`);
          console.error(`   3. 2-Step Verification is enabled on your Google account`);

          res.status(500).json({
            error: "Failed to send OTP email. Please verify your email configuration is correct."
          });
          return;
        }

        console.log(`Mobile login OTP sent to ${user.email} for phone ${phone}`);
      } else {
        // No email address - cannot send OTP
        console.error(`No email address for user with phone ${phone}`);
        res.status(500).json({ error: "No email address registered for this phone number" });
        return;
      }

      res.json({ success: true, message: "OTP sent to your registered email" });
    } catch (error) {
      console.error("Send mobile OTP error:", error);
      res.status(500).json({ error: "Failed to send OTP" });
    }
  });

  // Mobile Login - Verify OTP
  app.post("/api/auth/mobile-login/verify-otp", async (req, res) => {
    try {
      const { phone, otp } = req.body;
      const isValid = await storage.verifyOtp(phone, otp, 'phone');

      if (!isValid) {
        res.status(400).json({ error: "Invalid or expired OTP" });
        return;
      }

      const user = await storage.getUserByPhone(phone);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      req.session.userId = user.id;
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

      await storage.deleteOtp(phone, 'phone');

      res.json({
        success: true,
        id: user.id,
        username: user.username,
        email: user.email
      });
    } catch (error) {
      console.error("Verify mobile OTP error:", error);
      res.status(500).json({ error: "Failed to verify OTP" });
    }
  });

  // ChatGPT endpoint with image support (Google Gemini)
  app.post('/api/chat', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    try {
      const { messages } = req.body
      const userId = req.session.userId

      // Check user's quota (stored in memory, resets on server restart)
      const userQuota = await storage.getUserQuota(userId)
      const dailyLimit = 50 // Default daily limit per user

      if (userQuota >= dailyLimit) {
        return res.status(429).json({
          error: `Daily quota limit reached (${dailyLimit} requests). Your quota will reset when you logout and login again, or when the server restarts.`,
          quotaExceeded: true,
          limit: dailyLimit,
          used: userQuota
        })
      }

      const geminiApiKey = process.env.GEMINI_API_KEY
      if (!geminiApiKey) {
        console.error('Gemini API key not found in environment variables')
        return res.status(500).json({
          error: 'Gemini API key not configured. Please add GEMINI_API_KEY to your Secrets tool. Get a free API key at https://aistudio.google.com/app/apikey'
        })
      }

      console.log('Using Gemini API key:', geminiApiKey.slice(0, 10) + '...')
      console.log(`User ${userId} quota: ${userQuota}/${dailyLimit}`)

      // Check if any message contains an image
      const hasImages = messages.some((msg: any) => msg.imageUrl)

      // Use gemini-1.5-pro-latest for vision support, gemini-pro for text-only
      const model = hasImages ? 'gemini-1.5-pro-latest' : 'gemini-pro'
      const apiVersion = hasImages ? 'v1beta' : 'v1'

      // Convert messages to Gemini format
      const contents: any[] = []

      for (const msg of messages) {
        if (msg.imageUrl) {
          // Handle image messages
          const imageData = msg.imageUrl.split(',')[1] // Remove data:image/...;base64, prefix
          contents.push({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [
              { text: msg.content || 'What is in this image?' },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: imageData
                }
              }
            ]
          })
        } else {
          // Standard text message
          contents.push({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
          })
        }
      }

      console.log(`Using Gemini model: ${model} with API version: ${apiVersion}`)

      const response = await fetch(`https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2000
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Gemini API error:', errorData)

        let errorMsg = 'Failed to get response from Gemini AI'
        if (errorData.error?.message) {
          errorMsg = errorData.error.message
        }

        throw new Error(errorMsg)
      }

      const data = await response.json()
      const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response.'

      // Increment user's quota count
      await storage.incrementUserQuota(userId)
      const newQuota = await storage.getUserQuota(userId)

      res.json({
        message: aiResponse,
        quotaUsed: newQuota,
        quotaLimit: dailyLimit
      })
    } catch (error: any) {
      console.error('Chat error:', error)
      res.status(500).json({ error: error.message || 'Failed to get response' })
    }
  })

  // Password reset endpoint
  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { email, otp, password } = req.body;
      const isValid = await storage.verifyOtp(email, otp, 'email');

      if (!isValid) {
        res.status(400).json({ error: "Invalid or expired OTP" });
        return;
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const hashedPassword = hashPassword(password);
      await storage.updatePasswordByEmail(email, hashedPassword);
      await storage.deleteOtp(email, 'email');

      res.json({ success: true, message: "Password reset successful" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // Change password endpoint
  app.post('/api/auth/change-password', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      const { newPassword } = req.body;

      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      const hashedPassword = hashPassword(newPassword);

      console.log('Updating password for user:', req.session.userId);
      console.log('New password hash:', hashedPassword.substring(0, 10) + '...');

      // Update hashed password in database/memory - this is what's used for login
      const updated = await storage.updatePassword(req.session.userId, hashedPassword);

      if (!updated) {
        throw new Error('Failed to update password');
      }

      // Verify the update worked by reading it back
      const user = await storage.getUserById(req.session.userId);
      console.log('Password stored in database:', user?.password.substring(0, 10) + '...');
      console.log('Password match after update:', user?.password === hashedPassword);
      console.log('Password updated successfully - user should login with new password');

      res.json({ message: 'Password updated successfully' });
    } catch (error: any) {
      console.error('Change password error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update user information endpoint
  app.patch('/api/auth/update-info', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      const { username, email, phone } = req.body;
      const userId = req.session.userId;

      // Check if email is being changed and if it's already in use by another user
      if (email) {
        const existingEmail = await storage.getUserByEmail(email);
        if (existingEmail && existingEmail.id !== userId) {
          return res.status(400).json({ error: 'Email already in use by another account' });
        }
      }

      // Check if phone is being changed and if it's already in use by another user
      if (phone) {
        const existingPhone = await storage.getUserByPhone(phone);
        if (existingPhone && existingPhone.id !== userId) {
          return res.status(400).json({ error: 'Phone number already in use by another account' });
        }
      }

      // Update user information
      const updated = await storage.updateUserInfo(userId, { username, email, phone });

      if (!updated) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ success: true, message: 'User information updated successfully' });
    } catch (error: any) {
      console.error('Update user info error:', error);
      res.status(500).json({ error: error.message || 'Failed to update user information' });
    }
  });

  // Jobs routes
  app.get("/api/jobs", async (req, res) => {
    try {
      if (!req.session.userId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }
      const userId = getUserId(req);
      const jobs = await storage.getAllJobs(userId);
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch jobs" });
    }
  });

  app.post("/api/jobs", async (req, res) => {
    try {
      if (!req.session.userId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }
      const userId = getUserId(req);
      const jobData = insertJobSchema.parse({ ...req.body, userId });
      const job = await storage.createJob(jobData);
      broadcast("job:created", job);
      res.json(job);
    } catch (error) {
      res.status(400).json({ error: "Invalid job data" });
    }
  });

  app.put("/api/jobs/:id", async (req, res) => {
    try {
      const job = await storage.updateJob(req.params.id, req.body);
      if (!job) {
        res.status(404).json({ error: "Job not found" });
        return;
      }
      broadcast("job:updated", job);
      res.json(job);
    } catch (error) {
      res.status(400).json({ error: "Failed to update job" });
    }
  });

  app.delete("/api/jobs/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteJob(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: "Job not found" });
        return;
      }
      broadcast("job:deleted", { id: req.params.id });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete job" });
    }
  });

  // Tasks routes
  app.get("/api/tasks", async (req, res) => {
    try {
      if (!req.session.userId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }
      const userId = getUserId(req);
      // --- Modified to filter tasks by last 5 days ---
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      const tasks = await storage.getTasksSince(userId, fiveDaysAgo.toISOString());
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      if (!req.session.userId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }
      const userId = getUserId(req);
      // Check for duplicate task by URL
      if (req.body.url) {
        // Fetch tasks only within the last 5 days to check for duplicates
        const fiveDaysAgo = new Date();
        fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
        const existingTasks = await storage.getTasksSince(userId, fiveDaysAgo.toISOString());
        const normalizedUrl = req.body.url.toLowerCase().replace(/\/$/, '');
        const isDuplicate = existingTasks.some(task =>
          task.url && task.url.toLowerCase().replace(/\/$/, '') === normalizedUrl
        );
        if (isDuplicate) {
          res.status(400).json({ error: "Task with this URL already exists in the last 5 days" });
          return;
        }
      }

      const taskData = insertTaskSchema.parse({ ...req.body, userId });
      const task = await storage.createTask(taskData);
      broadcast("task:created", task);
      res.json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(400).json({ error: "Invalid task data" });
    }
  });

  app.put("/api/tasks/:id", async (req, res) => {
    try {
      const task = await storage.updateTask(req.params.id, req.body);
      if (!task) {
        res.status(404).json({ error: "Task not found" });
        return;
      }
      broadcast("task:updated", task);
      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(400).json({ error: "Failed to update task" });
    }
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    try {
      const task = await storage.updateTask(req.params.id, req.body);
      if (!task) {
        res.status(404).json({ error: "Task not found" });
        return;
      }
      broadcast("task:updated", task);
      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(400).json({ error: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteTask(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: "Task not found" });
        return;
      }
      broadcast("task:deleted", { id: req.params.id });
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  // Notes routes - get all notes
  app.get("/api/notes", async (req, res) => {
    try {
      if (!req.session.userId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }
      const userId = getUserId(req);
      const notes = await storage.getAllNotes(userId);
      res.json(notes);
    } catch (error) {
      console.error("Error fetching notes:", error);
      res.status(500).json({ error: "Failed to fetch notes" });
    }
  });

  // Create a new note
  app.post("/api/notes", async (req, res) => {
    try {
      if (!req.session.userId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }
      const userId = getUserId(req);
      console.log('Creating note with data:', req.body, 'for user:', userId);
      const noteData = insertNoteSchema.parse({ ...req.body, userId });
      const note = await storage.createNote(noteData);
      console.log('Note created:', note);
      broadcast("note:created", note);
      res.json(note);
    } catch (error) {
      console.error('Error creating note:', error);
      res.status(400).json({ error: "Invalid note data" });
    }
  });

  // Update a note
  app.patch("/api/notes/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }
      const note = await storage.updateNote(req.params.id, req.body);
      if (!note) {
        res.status(404).json({ error: "Note not found" });
        return;
      }
      broadcast("note:updated", note);
      res.json(note);
    } catch (error) {
      console.error('Error updating note:', error);
      res.status(400).json({ error: "Invalid note data" });
    }
  });

  // Delete a note
  app.delete("/api/notes/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteNote(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: "Note not found" });
        return;
      }
      broadcast("note:deleted", { id: req.params.id });
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting note:", error);
      res.status(500).json({ error: "Failed to delete note" });
    }
  });

  // Email configuration diagnostic endpoint (development only)
  app.get("/api/diagnostic/email-config", async (req, res) => {
    try {
      // Only allow in development mode for security
      if (process.env.NODE_ENV === 'production') {
        res.status(403).json({
          error: 'Diagnostic endpoints are disabled in production'
        });
        return;
      }

      const diagnostics = {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        emailConfigured: !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD),
        gmailUserSet: !!process.env.GMAIL_USER,
        gmailPasswordSet: !!process.env.GMAIL_APP_PASSWORD,
        gmailUser: process.env.GMAIL_USER ? process.env.GMAIL_USER.substring(0, 3) + '***' : 'NOT_SET',
        issues: [] as string[],
        recommendations: [] as string[]
      };

      // Check for issues
      if (!process.env.GMAIL_USER) {
        diagnostics.issues.push('GMAIL_USER environment variable is not set');
        diagnostics.recommendations.push('Add GMAIL_USER to your Secrets/Environment Variables');
      }

      if (!process.env.GMAIL_APP_PASSWORD) {
        diagnostics.issues.push('GMAIL_APP_PASSWORD environment variable is not set');
        diagnostics.recommendations.push('Generate a Gmail App Password and add it to Secrets');
      }

      if (process.env.GMAIL_APP_PASSWORD && process.env.GMAIL_APP_PASSWORD.length !== 16) {
        diagnostics.issues.push(`GMAIL_APP_PASSWORD length is ${process.env.GMAIL_APP_PASSWORD.length}, expected 16 characters`);
        diagnostics.recommendations.push('Gmail App Passwords are always 16 characters. Please verify your App Password.');
      }

      // Overall status
      const status = diagnostics.issues.length === 0 ? 'OK' : 'NEEDS_CONFIGURATION';

      res.json({
        status,
        message: status === 'OK'
          ? 'Email configuration is complete'
          : 'Email configuration needs attention',
        diagnostics
      });
    } catch (error) {
      console.error('Email diagnostic error:', error);
      res.status(500).json({
        status: 'ERROR',
        message: 'Failed to run email diagnostics',
        error: String(error)
      });
    }
  });

  // File Management Routes

  // Upload file
  app.post("/api/files/upload", fileUpload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        console.error("Upload attempt without authentication");
        return res.status(401).json({ error: "Not authenticated" });
      }

      console.log("File upload request:", {
        hasFile: !!req.file,
        fileName: req.file?.originalname,
        fileSize: req.file?.size,
        mimeType: req.file?.mimetype
      });

      if (!req.file) {
        console.error("No file in upload request");
        return res.status(400).json({ error: "No file uploaded" });
      }

      const fileData = {
        userId: req.session.userId,
        folderId: req.body.folderId || null,
        name: req.file.originalname,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size.toString(),
        path: req.file.path,
      };

      console.log("File data with folder:", fileData);

      console.log("Creating file record:", fileData.name);
      const validatedData = insertFileSchema.parse(fileData);
      const file = await storage.createFile(validatedData);

      console.log("File uploaded successfully:", file.id);
      res.json(file);
    } catch (error: any) {
      console.error("File upload error:", error);
      res.status(500).json({ error: error.message || "Failed to upload file" });
    }
  });

  // Get all files
  app.get("/api/files", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const files = await storage.getAllFiles(req.session.userId);
      res.json(files);
    } catch (error: any) {
      console.error("Get files error:", error);
      res.status(500).json({ error: error.message || "Failed to get files" });
    }
  });

  // Get file by ID
  app.get("/api/files/:id", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const file = await storage.getFileById(req.params.id);
      if (!file || file.userId !== req.session.userId) {
        return res.status(404).json({ error: "File not found" });
      }

      res.json(file);
    } catch (error: any) {
      console.error("Get file error:", error);
      res.status(500).json({ error: error.message || "Failed to get file" });
    }
  });

  // Download file
  app.get("/api/files/:id/download", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const file = await storage.getFileById(req.params.id);
      if (!file || file.userId !== userId) {
        return res.status(404).json({ error: "File not found" });
      }

      const fs = require('fs');
      const path = require('path');

      // Check if file exists on disk
      if (!fs.existsSync(file.path)) {
        console.error("File not found on disk:", file.path);
        return res.status(404).json({ error: "File not found on disk" });
      }

      // Set headers for inline display (PDFs and images)
      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${file.name}"`);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Accept-Ranges', 'bytes');
      
      // Get file stats for content length
      const stat = fs.statSync(file.path);
      res.setHeader('Content-Length', stat.size);

      // Send the file using sendFile for proper streaming
      res.sendFile(path.resolve(file.path), (err: any) => {
        if (err) {
          console.error("Error sending file:", err);
          if (!res.headersSent) {
            res.status(500).json({ error: "Failed to send file" });
          }
        }
      });
    } catch (error: any) {
      console.error("Download file error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to retrieve file" });
      }
    }
  });

  // Rename file
  app.patch("/api/files/:id", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const file = await storage.getFileById(req.params.id);
      if (!file || file.userId !== req.session.userId) {
        return res.status(404).json({ error: "File not found" });
      }

      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Name is required" });
      }

      const updatedFile = await storage.updateFile(req.params.id, { name, originalName: name });
      res.json(updatedFile);
    } catch (error: any) {
      console.error("Rename file error:", error);
      res.status(500).json({ error: error.message || "Failed to rename file" });
    }
  });

  // Move file to trash (soft delete)
  app.delete("/api/files/:id", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const file = await storage.getFileById(req.params.id);
      if (!file || file.userId !== req.session.userId) {
        return res.status(404).json({ error: "File not found" });
      }

      await storage.deleteFile(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Move to trash error:", error);
      res.status(500).json({ error: error.message || "Failed to move file to trash" });
    }
  });

  // Folder Management Routes

  // Create folder
  app.post("/api/folders", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const folderData = {
        userId: req.session.userId,
        name: req.body.name,
        parentId: req.body.parentId || null,
      };

      const validatedData = insertFolderSchema.parse(folderData);
      const folder = await storage.createFolder(validatedData);
      res.json(folder);
    } catch (error: any) {
      console.error("Create folder error:", error);
      res.status(500).json({ error: error.message || "Failed to create folder" });
    }
  });

  // Get all folders
  app.get("/api/folders", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const folders = await storage.getAllFolders(req.session.userId);
      res.json(folders);
    } catch (error: any) {
      console.error("Get folders error:", error);
      res.status(500).json({ error: error.message || "Failed to get folders" });
    }
  });

  // Rename folder
  app.patch("/api/folders/:id", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const folder = await storage.getFolderById(req.params.id);
      if (!folder || folder.userId !== req.session.userId) {
        return res.status(404).json({ error: "Folder not found" });
      }

      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Name is required" });
      }

      const updatedFolder = await storage.updateFolder(req.params.id, { name });
      res.json(updatedFolder);
    } catch (error: any) {
      console.error("Rename folder error:", error);
      res.status(500).json({ error: error.message || "Failed to rename folder" });
    }
  });

  // Delete folder
  app.delete("/api/folders/:id", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const folder = await storage.getFolderById(req.params.id);
      if (!folder || folder.userId !== req.session.userId) {
        return res.status(404).json({ error: "Folder not found" });
      }

      await storage.deleteFolder(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete folder error:", error);
      res.status(500).json({ error: error.message || "Failed to delete folder" });
    }
  });

  // Resume Analysis Endpoint
  app.post("/api/resume/analyze", upload.single('resume'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No resume file uploaded" });
      }

      const jobDescription = req.body.jobDescription;
      if (!jobDescription) {
        return res.status(400).json({ error: "Job description is required" });
      }

      // Extract text from PDF
      const pdfData = await pdfParse(req.file.buffer);
      const resumeText = pdfData.text;

      // Analyze with AI
      const analysis = await analyzeResumeWithAI(resumeText, jobDescription);

      res.json(analysis);
    } catch (error: any) {
      console.error("Resume analysis error:", error);
      res.status(500).json({ error: error.message || "Failed to analyze resume" });
    }
  });

  // WebSocket upgrade handling is done in index.ts
  return httpServer;
}