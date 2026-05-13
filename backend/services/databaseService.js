import mongoose from 'mongoose';

let databaseReady = false;

export async function connectDatabase(uri) {
  if (!uri) {
    console.warn('MONGO_URI is empty. Using in-memory history for this session.');
    return false;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000
    });
    databaseReady = true;
    console.log('MongoDB connected');
    return true;
  } catch (error) {
    databaseReady = false;
    console.warn(`MongoDB unavailable. Using in-memory history. ${error.message}`);
    return false;
  }
}

export function isDatabaseReady() {
  return databaseReady && mongoose.connection.readyState === 1;
}
