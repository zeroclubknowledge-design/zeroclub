import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { requireAuth, type AuthRequest } from "../lib/auth";

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    cb(null, unique + path.extname(file.originalname).toLowerCase());
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^(image|video)\//.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image and video files are allowed"));
    }
  },
});

const router = Router();

router.post("/", requireAuth, upload.single("file"), (req: AuthRequest, res) => {
  if (!req.file) {
    res.status(400).json({ error: "no_file", message: "No file provided" });
    return;
  }
  const url = `/api/uploads/${req.file.filename}`;
  const mediaType = req.file.mimetype.startsWith("video/") ? "video" : "image";
  res.json({ url, mediaType });
});

export default router;
