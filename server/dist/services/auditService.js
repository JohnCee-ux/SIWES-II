"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAuditEvent = void 0;
const AuditLog_js_1 = require("../models/AuditLog.js");
const logAuditEvent = async (params) => {
    try {
        await AuditLog_js_1.AuditLog.create({
            eventId: params.eventId ? params.eventId.toString() : null,
            attendeeId: params.attendeeId ? params.attendeeId.toString() : null,
            organizerId: params.organizerId ? params.organizerId.toString() : null,
            action: params.action,
            timestamp: new Date(),
            metadata: params.metadata || {},
            attendeeName: params.attendeeName || '',
            ticketCode: params.ticketCode || '',
        });
    }
    catch (err) {
        console.error('[AuditLog Error] Failed to write audit log entry:', err);
    }
};
exports.logAuditEvent = logAuditEvent;
