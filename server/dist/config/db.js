"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeDB = exports.connectDB = exports.isUsingMemoryStore = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const mongodb_memory_server_1 = require("mongodb-memory-server");
let mongoMemoryServer = null;
exports.isUsingMemoryStore = false;
const connectDB = async () => {
    const customUri = process.env.MONGO_URI;
    if (customUri) {
        try {
            console.log(`Connecting to MongoDB URI: ${customUri.replace(/:[^:@]+@/, ':****@')}`);
            await mongoose_1.default.connect(customUri, {
                serverSelectionTimeoutMS: 2500,
                connectTimeoutMS: 2500,
            });
            console.log('Connected successfully to MongoDB');
            return customUri;
        }
        catch (err) {
            console.warn('Failed to connect to configured MONGO_URI, using in-memory store:', err);
        }
    }
    // Try local MongoDB on 127.0.0.1:27017 with short timeout
    try {
        const localUri = 'mongodb://127.0.0.1:27017/gatekeeper';
        await mongoose_1.default.connect(localUri, {
            serverSelectionTimeoutMS: 1500,
            connectTimeoutMS: 1500,
        });
        console.log('Connected to local MongoDB (127.0.0.1:27017)');
        return localUri;
    }
    catch {
        // Local mongo not running
    }
    // Attempt MongoMemoryServer with a 3.5-second timeout
    try {
        const memoryServerPromise = mongodb_memory_server_1.MongoMemoryServer.create({
            instance: { dbName: 'gatekeeper' },
        });
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('MongoMemoryServer startup timeout')), 3500));
        mongoMemoryServer = await Promise.race([memoryServerPromise, timeoutPromise]);
        const uri = mongoMemoryServer.getUri();
        await mongoose_1.default.connect(uri);
        console.log(`Connected to MongoMemoryServer: ${uri}`);
        return uri;
    }
    catch (err) {
        console.log('Using in-process zero-friction memory store for instant execution.');
        exports.isUsingMemoryStore = true;
        return 'memory://in-process-store';
    }
};
exports.connectDB = connectDB;
const closeDB = async () => {
    try {
        await mongoose_1.default.connection.close();
    }
    catch { }
    if (mongoMemoryServer) {
        try {
            await mongoMemoryServer.stop();
        }
        catch { }
    }
};
exports.closeDB = closeDB;
