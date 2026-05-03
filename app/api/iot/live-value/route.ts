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

const MQTT_HOST = process.env.MQTT_HOST as string;
const MQTT_USERNAME = process.env.MQTT_USERNAME as string;
const MQTT_PASSWORD = process.env.MQTT_PASSWORD as string;
const MQTT_TOPIC = process.env.MQTT_TOPIC as string;

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
    // Fallback untuk payload non-JSON: anggap sebagai volume langsung.
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
    client?.subscribe(MQTT_TOPIC, (error) => {
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

  return NextResponse.json({
    connected: isConnected,
    topic: MQTT_TOPIC,
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
      const qualityTopic = MQTT_TOPIC.replace('/value', '/quality');
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
