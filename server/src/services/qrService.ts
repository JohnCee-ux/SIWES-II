import QRCode from 'qrcode';

export const generateQRCodeDataUrl = async (payload: string): Promise<string> => {
  return await QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
    color: {
      dark: '#0A0F1C',
      light: '#FFFFFF',
    },
  });
};
