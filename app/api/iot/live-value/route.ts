export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import mqtt, { MqttClient } from 'mqtt';

type MqttReading = {
  id_device?: string;
  volume_disetor?: number | string;
  skor_kualitas?: number | string;
  volume_jerigen_a?: number | string;
  volume_jerigen_b?: number | string;
  sensor_status?: boolean;
  timestamp?: string;
  [key: string]: unknown;
};

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

const MQTT_HOST = getRequiredEnv('MQTT_HOST');
const MQTT_USERNAME = getRequiredEnv('MQTT_USERNAME');
const MQTT_PASSWORD = getRequiredEnv('MQTT_PASSWORD');
const MQTT_DEVICE_CODE = getRequiredEnv('MQTT_DEVICE_CODE');

const valueTopic = `jelantah/${MQTT_DEVICE_CODE}/value`;
const qualityTopic = `jelantah/${MQTT_DEVICE_CODE}/quality`;

let client: MqttClient | null = null;
let isConnected = false;
let latestPayload: MqttReading | null = null;
let latestTopic = '';
let latestUpdatedAt: string | null = null;

function parseMessage(raw: string): MqttReading {
  try {
    const parsed = JSON.parse(raw) as MqttReading;
    return parsed;
  } catch {
    const numericVolume = Number(raw);
    if (!Number.isNaN(numericVolume)) {
      return { volume_disetor: numericVolume, timestamp: new Date().toISOString() };
    }
    return { raw, timestamp: new Date().toISOString() };
  }
}

function ensureMqttConnection() {
  if (client) return;

  client = mqtt.connect(MQTT_HOST, {
    username: MQTT_USERNAME,
    password: MQTT_PASSWORD,
    reconnectPeriod: 3000,
    connectTimeout: 10_000,
  });

  client.on('connect', () => {
    isConnected = true;
    client?.subscribe(valueTopic, (error) => {
      if (error) {
        console.error('MQTT subscribe error:', error.message);
      }
    });
  });

  client.on('reconnect', () => {
    isConnected = false;
  });

  client.on('close', () => {
    isConnected = false;
  });

  client.on('error', (error) => {
    isConnected = false;
    console.error('MQTT connection error:', error.message);
  });

  client.on('message', (topic, message) => {
    latestTopic = topic;
    latestPayload = parseMessage(message.toString());
    latestUpdatedAt = new Date().toISOString();
  });
}

export async function GET() {
  ensureMqttConnection();

  // Khusus untuk development lokal, jika belum ada payload, kita usahakan tunggu sebentar
  // agar preview tidak selalu null.
  if (!latestPayload && client && process.env.NODE_ENV === 'development') {
    await new Promise<void>((resolve) => {
      let timeout: NodeJS.Timeout;
      const handler = () => {
        clearTimeout(timeout);
        client?.removeListener('message', handler);
        resolve();
      };
      timeout = setTimeout(() => {
        client?.removeListener('message', handler);
        resolve();
      }, 2500);
      client?.on('message', handler);
    });
  }

  return NextResponse.json({
    connected: isConnected,
    topic: valueTopic,
    latestTopic,
    updatedAt: latestUpdatedAt,
    payload: latestPayload,
  });
}

export async function POST(request: Request) {
  try {
    ensureMqttConnection();
    
    const body = await request.json();
    
    if (body.action === 'PUBLISH_QUALITY') {
      if (client && isConnected) {
        client.publish(qualityTopic, JSON.stringify({ quality: 'CHEK' }));
        return NextResponse.json({ success: true, message: `Published to ${qualityTopic}` });
      } else {
        return NextResponse.json({ success: false, message: 'MQTT not connected' }, { status: 500 });
      }
    }
    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
