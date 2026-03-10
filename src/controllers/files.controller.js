import { ObjectId } from 'mongodb';
import { Readable } from 'stream';
import { getGridFSBucket } from '../config/gridfs.js';

// POST /api/files/upload — Upload image (multipart/form-data)
export async function uploadFile(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const bucket = getGridFSBucket();
    const readableStream = Readable.from(req.file.buffer);
    
    const uploadStream = bucket.openUploadStream(req.file.originalname, {
      contentType: req.file.mimetype,
      metadata: {
        uploadedAt: new Date(),
        size: req.file.size
      }
    });

    readableStream.pipe(uploadStream);

    uploadStream.on('finish', () => {
      res.status(201).json({
        message: 'File uploaded successfully',
        fileId: uploadStream.id,
        filename: req.file.originalname
      });
    });

    uploadStream.on('error', (error) => {
      res.status(500).json({ error: error.message });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// GET /api/files/:fileId — Stream file back to client
export async function downloadFile(req, res) {
  try {
    const bucket = getGridFSBucket();
    const fileId = new ObjectId(req.params.fileId);

    // Check if file exists
    const files = await bucket.find({ _id: fileId }).toArray();
    
    if (files.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = files[0];

    res.set({
      'Content-Type': file.contentType || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${file.filename}"`
    });

    const downloadStream = bucket.openDownloadStream(fileId);
    
    downloadStream.on('error', (error) => {
      res.status(500).json({ error: error.message });
    });

    downloadStream.pipe(res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// DELETE /api/files/:fileId — Delete file from GridFS
export async function deleteFile(req, res) {
  try {
    const bucket = getGridFSBucket();
    const fileId = new ObjectId(req.params.fileId);

    // Check if file exists
    const files = await bucket.find({ _id: fileId }).toArray();
    
    if (files.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    await bucket.delete(fileId);
    
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// GET /api/files — List all files
export async function listFiles(req, res) {
  try {
    const bucket = getGridFSBucket();
    const files = await bucket.find().toArray();
    
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
