import axios from 'axios';

export async function sendWaNotification(phone: string | null | undefined, message: string) {
  const token = process.env.FONNTE_TOKEN;
  if (!token) {
    console.warn('FONNTE_TOKEN is not configured in environment variables.');
    return;
  }

  if (!phone) {
    console.warn('Cannot send WA notification: recipient phone number is empty.');
    return;
  }

  // Normalize phone number to string and trim spaces
  let cleanPhone = phone.trim();

  // If number starts with '0', change it to '62' (Indonesia country code)
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '62' + cleanPhone.substring(1);
  }

  try {
    const response = await axios.post(
      'https://api.fonnte.com/send',
      {
        target: cleanPhone,
        message: message,
      },
      {
        headers: {
          Authorization: token,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log(`WhatsApp sent to ${cleanPhone} via Fonnte:`, response.data);
    return response.data;
  } catch (error: any) {
    console.error(`Failed to send WhatsApp to ${cleanPhone} via Fonnte:`, error.response?.data || error.message);
  }
}
