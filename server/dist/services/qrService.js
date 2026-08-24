"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateQRCodeDataUrl = void 0;
const qrcode_1 = __importDefault(require("qrcode"));
const generateQRCodeDataUrl = async (payload) => {
    return await qrcode_1.default.toDataURL(payload, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 320,
        color: {
            dark: '#0A0F1C',
            light: '#FFFFFF',
        },
    });
};
exports.generateQRCodeDataUrl = generateQRCodeDataUrl;
