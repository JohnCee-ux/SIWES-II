"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errorHandler = (err, _req, res, _next) => {
    console.error('[Unhandled Error]', err);
    if (err.name === 'ValidationError') {
        res.status(400).json({
            error: 'Validation Error',
            details: Object.values(err.errors).map((e) => e.message),
        });
        return;
    }
    if (err.code === 11000) {
        res.status(409).json({
            error: 'Conflict Error: A record with this unique identifier already exists.',
        });
        return;
    }
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
    });
};
exports.errorHandler = errorHandler;
