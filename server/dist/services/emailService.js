"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTicketEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
let transporter = null;
const getTransporter = async () => {
    if (transporter)
        return transporter;
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_APP_PASSWORD || process.env.EMAIL_PASS;
    if (emailUser && emailPass) {
        transporter = nodemailer_1.default.createTransport({
            service: process.env.EMAIL_SERVICE || 'gmail',
            auth: {
                user: emailUser,
                pass: emailPass,
            },
        });
        console.log(`Configured production email transporter with ${emailUser}`);
        return transporter;
    }
    // Fallback: create ethereal test account
    try {
        const testAccount = await nodemailer_1.default.createTestAccount();
        transporter = nodemailer_1.default.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        });
        console.log(`Configured Ethereal Email test transporter: ${testAccount.user}`);
        return transporter;
    }
    catch (err) {
        console.warn('Could not create Ethereal test account, using JSON/stream transporter fallback', err);
        transporter = nodemailer_1.default.createTransport({
            streamTransport: true,
            newline: 'windows',
            buffer: true,
        });
        return transporter;
    }
};
const sendTicketEmail = async (params) => {
    try {
        const transport = await getTransporter();
        // Clean base64 for attachment
        const base64Data = params.qrDataUrl.replace(/^data:image\/png;base64,/, '');
        const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0A0F1C; color: #F3F4F6; margin: 0; padding: 24px; }
          .card { max-width: 520px; margin: 0 auto; background-color: #111827; border: 1px solid #1F2937; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
          .header { background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 50%, #EC4899 100%); padding: 32px 24px; text-align: center; }
          .header h1 { margin: 0; color: #FFFFFF; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
          .header p { margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.85); font-size: 14px; }
          .content { padding: 28px 24px; text-align: center; }
          .ticket-badge { display: inline-block; background-color: rgba(59, 130, 246, 0.15); border: 1px solid #3B82F6; color: #60A5FA; padding: 4px 14px; border-radius: 9999px; font-size: 13px; font-weight: 600; text-transform: uppercase; margin-bottom: 20px; }
          .qr-box { background-color: #FFFFFF; padding: 16px; border-radius: 12px; display: inline-block; margin-bottom: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
          .qr-img { width: 200px; height: 200px; display: block; }
          .code-box { background-color: #0A0F1C; border: 1px dashed #374151; border-radius: 8px; padding: 12px; margin-bottom: 24px; }
          .code-label { font-size: 11px; color: #9CA3AF; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
          .code-val { font-family: monospace; font-size: 20px; font-weight: 700; color: #38BDF8; letter-spacing: 2px; }
          .details-grid { text-align: left; background-color: #0A0F1C; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
          .detail-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
          .detail-row:last-child { margin-bottom: 0; }
          .detail-label { color: #9CA3AF; }
          .detail-value { color: #F3F4F6; font-weight: 500; }
          .footer { text-align: center; color: #6B7280; font-size: 12px; border-top: 1px solid #1F2937; padding-top: 16px; margin-top: 24px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <h1>${params.eventName}</h1>
            <p>Official Event Entry Ticket</p>
          </div>
          <div class="content">
            <div class="ticket-badge">${params.ticketType} Pass</div>
            
            <div>
              <div class="qr-box">
                <img src="cid:ticket-qr" alt="QR Code" class="qr-img" />
              </div>
            </div>

            <div class="code-box">
              <div class="code-label">Ticket Code (Manual Entry)</div>
              <div class="code-val">${params.ticketCode}</div>
            </div>

            <div class="details-grid">
              <div class="detail-row">
                <span class="detail-label">Attendee</span>
                <span class="detail-value">${params.attendeeName}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Date</span>
                <span class="detail-value">${params.date}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Time</span>
                <span class="detail-value">${params.startTime}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Venue</span>
                <span class="detail-value">${params.venue}</span>
              </div>
            </div>

            <p style="font-size: 13px; color: #9CA3AF; margin: 0;">
              Please present this QR code or ticket code at the entrance for fast check-in.
            </p>

            <div class="footer">
              Powered by GateKeeper Secure Check-In System
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
        const info = await transport.sendMail({
            from: process.env.EMAIL_FROM || '"GateKeeper Events" <tickets@gatekeeper.io>',
            to: params.toEmail,
            subject: `Your Ticket for ${params.eventName} (${params.ticketCode})`,
            html: htmlContent,
            attachments: [
                {
                    filename: 'ticket-qr.png',
                    content: Buffer.from(base64Data, 'base64'),
                    cid: 'ticket-qr',
                },
            ],
        });
        const previewUrl = nodemailer_1.default.getTestMessageUrl(info) || undefined;
        if (previewUrl) {
            console.log(`[Email] Ticket email sent to ${params.toEmail}. Preview: ${previewUrl}`);
        }
        else {
            console.log(`[Email] Ticket email successfully sent to ${params.toEmail}`);
        }
        return { success: true, previewUrl: previewUrl || undefined };
    }
    catch (err) {
        console.error(`[Email Error] Failed to send ticket email to ${params.toEmail}:`, err?.message || err);
        return { success: false, error: err?.message || 'Email delivery failed' };
    }
};
exports.sendTicketEmail = sendTicketEmail;
