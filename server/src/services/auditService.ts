import { AuditLog } from '../models/AuditLog.js';
import { AuditAction } from '../types.js';

export interface LogAuditParams {
  eventId: string | any;
  attendeeId?: string | any | null;
  organizerId?: string | any | null;
  action: AuditAction;
  metadata?: Record<string, any>;
  attendeeName?: string;
  ticketCode?: string;
}

export const logAuditEvent = async (params: LogAuditParams): Promise<void> => {
  try {
    await AuditLog.create({
      eventId: params.eventId ? params.eventId.toString() : null,
      attendeeId: params.attendeeId ? params.attendeeId.toString() : null,
      organizerId: params.organizerId ? params.organizerId.toString() : null,
      action: params.action,
      timestamp: new Date(),
      metadata: params.metadata || {},
      attendeeName: params.attendeeName || '',
      ticketCode: params.ticketCode || '',
    });
  } catch (err) {
    console.error('[AuditLog Error] Failed to write audit log entry:', err);
  }
};
