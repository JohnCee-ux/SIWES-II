"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_js_1 = require("./config/db.js");
const authRoutes_js_1 = __importDefault(require("./routes/authRoutes.js"));
const eventRoutes_js_1 = __importDefault(require("./routes/eventRoutes.js"));
const attendeeRoutes_js_1 = __importDefault(require("./routes/attendeeRoutes.js"));
const checkinRoutes_js_1 = __importDefault(require("./routes/checkinRoutes.js"));
const errorHandler_js_1 = require("./middleware/errorHandler.js");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// CORS configuration
const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    process.env.CLIENT_URL,
].filter(Boolean);
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl) or if in allowedOrigins
        if (!origin || allowedOrigins.includes(origin) || origin.includes('localhost') || origin.includes('127.0.0.1')) {
            callback(null, true);
        }
        else {
            callback(null, true); // Dev-friendly permissive
        }
    },
    credentials: true,
}));
app.use(express_1.default.json({ limit: '5mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '5mb' }));
app.use((0, cookie_parser_1.default)());
// API Health Check
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'GateKeeper Event Check-In API',
    });
});
// API Routes
app.use('/api/auth', authRoutes_js_1.default);
app.use('/api/events', eventRoutes_js_1.default);
app.use('/api/attendees', attendeeRoutes_js_1.default);
app.use('/api/checkins', checkinRoutes_js_1.default);
// Error Handling Middleware
app.use(errorHandler_js_1.errorHandler);
// Server startup
let serverInstance = null;
const startServer = async () => {
    try {
        await (0, db_js_1.connectDB)();
        serverInstance = app.listen(PORT, () => {
            console.log(`=========================================`);
            console.log(` GateKeeper API running on port ${PORT}`);
            console.log(` http://localhost:${PORT}`);
            console.log(` Health Check: http://localhost:${PORT}/api/health`);
            console.log(`=========================================`);
        });
    }
    catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
};
const handleShutdown = async () => {
    console.log('\nShutting down server gracefully...');
    if (serverInstance) {
        serverInstance.close();
    }
    await (0, db_js_1.closeDB)();
    process.exit(0);
};
process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);
startServer();
exports.default = app;
