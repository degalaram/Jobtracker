import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import FileStore from "session-file-store";
import { registerRoutes } from "../server/routes";
import { serveStatic } from "../server/vite";
import { verifyEmailConfig } from "../server/email";
import { autoConfigureEnvironment } from "../server/auto-config";
import path from "path";

const SessionFileStore = FileStore(session);

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

app.use(
  session({
    store: new SessionFileStore({
      path: '/tmp/.sessions',
      ttl: 365 * 24 * 60 * 60,
      retries: 0,
    }),
    secret: process.env.SESSION_SECRET || "daily-tracker-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 365 * 24 * 60 * 60 * 1000,
      path: '/',
    },
  })
);

app.use((req, res, next) => {
  const start = Date.now();
  const pathName = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (pathName.startsWith("/api")) {
      console.log(`${req.method} ${pathName} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

let initialized = false;

async function initializeApp() {
  if (!initialized) {
    autoConfigureEnvironment();
    
    verifyEmailConfig().catch(err => {
      console.error('Email verification failed:', err);
    });
    
    await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
      console.error(err);
    });

    serveStatic(app);
    
    initialized = true;
  }
  return app;
}

export default async (req: Request, res: Response) => {
  const application = await initializeApp();
  return application(req, res);
};
