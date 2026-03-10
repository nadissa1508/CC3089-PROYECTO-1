import { MongoClient } from 'mongodb';
import 'dotenv/config';

let client;
let db;

export async function connectDB() {
  if (db) return db;
  client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  db = client.db('restaurant_platform');
  console.log('Connected to MongoDB');
  return db;
}

export function getDB() {
  if (!db) throw new Error('DB not initialized. Call connectDB() first.');
  return db;
}

export function getClient() {
  return client;
}
