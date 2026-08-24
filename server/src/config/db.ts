// Import the mongoose library for MongoDB object modeling and connection management
import mongoose from 'mongoose';
// Import MongoMemoryServer, which spins up an in-memory MongoDB instance for development/testing
import { MongoMemoryServer } from 'mongodb-memory-server';

// Variable to hold a reference to the in-memory MongoDB server instance (null if not in use)
let mongoMemoryServer: MongoMemoryServer | null = null;
// Flag exported so other modules can check if the app is running on a pure in-process memory store
export let isUsingMemoryStore = false;

// Main database connection function — exported so the server entry point can call it on startup
// Returns a Promise that resolves to the connection URI string used
export const connectDB = async (): Promise<string> => {
  // Read the MongoDB connection string from the MONGO_URI environment variable
  const customUri = process.env.MONGO_URI;

  // --- TIER 1: Try the user-configured MONGO_URI (e.g. Atlas cloud or custom remote DB) ---
  if (customUri) { // Only attempt if the env variable is actually set
    try {
      // Log the URI with the password masked for security (replaces :password@ with :****@)
      console.log(`Connecting to MongoDB URI: ${customUri.replace(/:[^:@]+@/, ':****@')}`);
      // Attempt to connect to the configured URI with short timeouts to fail fast
      await mongoose.connect(customUri, {
        serverSelectionTimeoutMS: 2500, // Max time (ms) to find a suitable server before erroring
        connectTimeoutMS: 2500,        // Max time (ms) for the initial TCP connection to establish
      });
      // If we reach here, the connection succeeded — log confirmation
      console.log('Connected successfully to MongoDB');
      // Return the URI so the caller knows which database was connected to
      return customUri;
    } catch (err) {
      // If connection fails (e.g. bad credentials, network issue), warn and fall through to next tier
      console.warn('Failed to connect to configured MONGO_URI, using in-memory store:', err);
    }
  }

  // --- TIER 2: Try a locally running MongoDB on the default port ---
  try {
    // Define the connection string for a local MongoDB instance with the "gatekeeper" database
    const localUri = 'mongodb://127.0.0.1:27017/gatekeeper';
    // Attempt to connect to the local instance with even shorter timeouts
    await mongoose.connect(localUri, {
      serverSelectionTimeoutMS: 1500, // Max time (ms) to find a suitable server
      connectTimeoutMS: 1500,        // Max time (ms) for the TCP handshake
    });
    // Log success if the local MongoDB is running and reachable
    console.log('Connected to local MongoDB (127.0.0.1:27017)');
    // Return the local URI
    return localUri;
  } catch {
    // If local MongoDB isn't running, silently fall through to the next tier
  }

  // --- TIER 3: Spin up a MongoMemoryServer (in-memory MongoDB binary) ---
  try {
    // Start creating an in-memory MongoDB server with the database name "gatekeeper"
    const memoryServerPromise = MongoMemoryServer.create({
      instance: { dbName: 'gatekeeper' }, // Configure the in-memory instance's database name
    });

    // Create a timeout promise that rejects after 3.5 seconds — acts as a deadline
    const timeoutPromise = new Promise<never>((_, reject) =>
      // If MongoMemoryServer takes too long to start, reject with a timeout error
      setTimeout(() => reject(new Error('MongoMemoryServer startup timeout')), 3500)
    );

    // Race the memory server creation against the timeout — whichever settles first wins
    mongoMemoryServer = await Promise.race([memoryServerPromise, timeoutPromise]);
    // Get the auto-generated connection URI from the in-memory server
    const uri = mongoMemoryServer.getUri();
    // Connect mongoose to the in-memory MongoDB instance
    await mongoose.connect(uri);
    // Log the URI of the memory server for debugging
    console.log(`Connected to MongoMemoryServer: ${uri}`);
    // Return the in-memory URI
    return uri;
  } catch (err: any) {
    // --- TIER 4 (final fallback): Use a zero-friction in-process memory store ---
    // This means no real MongoDB at all — the app will use in-memory data structures
    console.log('Using in-process zero-friction memory store for instant execution.');
    // Set the flag so other parts of the app know data is NOT persisted to any database
    isUsingMemoryStore = true;
    // Return a custom URI string indicating the in-process memory store is in use
    return 'memory://in-process-store';
  }
};

// Function to gracefully close the database connection and stop any in-memory server
export const closeDB = async (): Promise<void> => {
  try {
    // Close the active mongoose connection to MongoDB (remote, local, or in-memory)
    await mongoose.connection.close();
  } catch {} // Silently ignore errors — connection may already be closed or never opened
  // If an in-memory MongoDB server was started, stop it to free resources
  if (mongoMemoryServer) {
    try {
      // Stop the MongoMemoryServer process and clean up temporary files
      await mongoMemoryServer.stop();
    } catch {} // Silently ignore errors — server may already be stopped
  }
};
