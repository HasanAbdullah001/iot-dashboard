
export interface IotStatus {
  motor1: 'ON' | 'OFF';
  motor2: 'ON' | 'OFF';
  timer: number; // in seconds
}

export type MqttConnectionStatus = 'Connected' | 'Disconnected' | 'Connecting' | 'Error';

export interface BrokerConfig {
  url: string;
  port: string;
  username?: string;
  password?: string;
}
