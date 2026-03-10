import express from 'express';
import multer from 'multer';
import {
  uploadFile,
  downloadFile,
  deleteFile,
  listFiles
} from '../controllers/files.controller.js';

const router = express.Router();

// Configure multer to use memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Upload
router.post('/upload', upload.single('file'), uploadFile);

// Read
router.get('/', listFiles);
router.get('/:fileId', downloadFile);

// Delete
router.delete('/:fileId', deleteFile);

export default router;
