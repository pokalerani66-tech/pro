
export enum AppScreen {
  WELCOME = 'WELCOME',
  MODE_SELECTION = 'MODE_SELECTION',
  MASTER_SETUP = 'MASTER_SETUP',
  MASTER_AUTH = 'MASTER_AUTH',
  MASTER_DASHBOARD = 'MASTER_DASHBOARD',
  USER_ACCESS_FLOW = 'USER_ACCESS_FLOW',
  USER_MODE = 'USER_MODE',
  MANDATORY_CONNECTION = 'MANDATORY_CONNECTION',
}

export interface CustomCommand {
  id: string;
  label: string;
  command: string;
  requiresPin: boolean;
}

export interface SystemConfig {
  deviceLabel: string;
  securityQuestion: string;
  securityAnswer: string;
  masterPassword: string;
  unlockPin: string;
  lockPin: string;
  allowedAttempts: number;
  lockoutEnabled: boolean;
  enabledUserActions: {
    unlock: boolean;
    lock: boolean;
    tempAccess: boolean;
    status: boolean;
    emergency: boolean;
  };
  customCommands: CustomCommand[];
}

export interface AccessLog {
  id: string;
  timestamp: Date;
  action: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'LOCKDOWN';
}

export interface BluetoothDevice {
  id: string;
  name: string;
  rssi: number;
}
