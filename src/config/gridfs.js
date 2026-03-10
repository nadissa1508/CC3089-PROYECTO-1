import { GridFSBucket } from 'mongodb';
import { getDB } from '../db/connection.js';

let bucket;

export function getGridFSBucket() {
  if (!bucket) {
    const db = getDB();
    bucket = new GridFSBucket(db, {
      bucketName: 'uploads'
    });
  }
  return bucket;
}
