
import React, { useState, useCallback, useEffect } from 'react';
import { 
  AppScreen, 
  SystemConfig, 
  AccessLog, 
  BluetoothDevice 
} from './types';
import WelcomeScreen from './screens/WelcomeScreen';
import ModeSelectionScreen from './screens/ModeSelectionScreen';
import MasterSetupScreen from './screens/MasterSetupScreen';
import MasterAuthScreen from './screens/MasterAuthScreen';
import MasterDashboardScreen from './screens/MasterDashboardScreen';
import UserAccessFlowScreen from './screens/UserAccessFlowScreen';
import UserModeScreen from './screens/UserModeScreen';
import MandatoryConnectionScreen from './screens/MandatoryConnectionScreen';

const STORAGE_KEY = 'sas_config_v1';
const ONBOARDING_KEY = 'sas_onboarding_complete';

const DEFAULT_CONFIG: SystemConfig = {
  deviceLabel: 'SmartNode-01',
  securityQuestion: '',
  securityAnswer: '',
  masterPassword: '',
  unlockPin: '1234',
  lockPin: '4321',
  allowedAttempts: 3,
  lockoutEnabled: true,
  enabledUserActions: {
    unlock: true,
    lock: true,
    tempAccess: true,
    status: true,
    emergency: true
  },
  customCommands: []
};

const App: React.FC = () => {
  // Persistence Initialization
  const [config, setConfig] = useState<SystemConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });

  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(() => {
    return localStorage.getItem(ONBOARDING_KEY) === 'true';
  });

  const [currentScreen, setCurrentScreen] = useState<AppScreen>(AppScreen.WELCOME);
  const [connectedDevice, setConnectedDevice] = useState<BluetoothDevice | null>(null);
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [isLockdown, setIsLockdown] = useState(false);

  // Sync config to storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  const navigateTo = (screen: AppScreen) => {
    setCurrentScreen(screen);
  };

  const addLog = useCallback((action: string, status: AccessLog['status'] = 'SUCCESS') => {
    const newLog: AccessLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      action,
      status
    };
    setLogs(prev => [newLog, ...prev].slice(0, 50));
  }, []);

  const handleConnect = (device: BluetoothDevice) => {
    setConnectedDevice(device);
    setHasCompletedOnboarding(true);
    localStorage.setItem(ONBOARDING_KEY, 'true');
    addLog(`Node Link Established: ${device.name}`, 'SUCCESS');
    navigateTo(AppScreen.MODE_SELECTION);
  };

  const handleDisconnect = () => {
    setConnectedDevice(null);
    addLog('Device Node Disconnected', 'PENDING');
    
    // If they already set up the master password, they are forced to mandatory connection
    if (config.masterPassword) {
      navigateTo(AppScreen.MANDATORY_CONNECTION);
    } else {
      navigateTo(AppScreen.USER_ACCESS_FLOW);
    }
  };

  const handleWrongAttempt = () => {
    const newAttempts = wrongAttempts + 1;
    setWrongAttempts(newAttempts);
    if (config.lockoutEnabled && newAttempts >= config.allowedAttempts) {
      setIsLockdown(true);
      addLog(`Critical Lockdown: ${newAttempts} Failures`, 'LOCKDOWN');
    } else {
      addLog(`Auth Failure ${newAttempts}/${config.allowedAttempts}`, 'FAILED');
    }
  };

  const handleUnlockLockdown = (password: string) => {
    if (password === config.masterPassword) {
      setIsLockdown(false);
      setWrongAttempts(0);
      addLog('Node Restored by Master', 'SUCCESS');
      return true;
    }
    return false;
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case AppScreen.WELCOME:
        return (
          <WelcomeScreen 
            connectedDevice={connectedDevice}
            isSetup={hasCompletedOnboarding}
            onDisconnect={handleDisconnect}
            onStart={() => navigateTo(AppScreen.USER_ACCESS_FLOW)}
            onAutoTransition={() => {
               if (connectedDevice) {
                navigateTo(AppScreen.MODE_SELECTION);
              } else {
                navigateTo(AppScreen.MANDATORY_CONNECTION);
              }
            }}
          />
        );
      
      case AppScreen.USER_ACCESS_FLOW:
        return (
          <UserAccessFlowScreen 
            deviceLabel={config.deviceLabel}
            onConnect={handleConnect}
            onBack={() => navigateTo(AppScreen.WELCOME)}
          />
        );

      case AppScreen.MANDATORY_CONNECTION:
        return (
          <MandatoryConnectionScreen 
            onContinue={() => navigateTo(AppScreen.USER_ACCESS_FLOW)}
          />
        );

      case AppScreen.MODE_SELECTION:
        return (
          <ModeSelectionScreen 
            isMasterSetup={!!config.masterPassword}
            connectedDevice={connectedDevice}
            onDisconnect={handleDisconnect}
            onBecomeMaster={() => {
              if (config.masterPassword) {
                navigateTo(AppScreen.MASTER_AUTH);
              } else {
                navigateTo(AppScreen.MASTER_SETUP);
              }
            }}
            onAccessDoor={() => navigateTo(AppScreen.USER_MODE)}
            onBack={() => navigateTo(AppScreen.WELCOME)}
          />
        );

      case AppScreen.MASTER_SETUP:
        return (
          <MasterSetupScreen 
            connectedDevice={connectedDevice}
            onDisconnect={handleDisconnect}
            onSave={(newConfig) => {
              setConfig(newConfig);
              addLog('Master Key Created', 'SUCCESS');
              navigateTo(AppScreen.MASTER_DASHBOARD);
            }}
            onBack={() => navigateTo(AppScreen.MODE_SELECTION)}
          />
        );

      case AppScreen.MASTER_AUTH:
        return (
          <MasterAuthScreen 
            masterPassword={config.masterPassword}
            connectedDevice={connectedDevice}
            onDisconnect={handleDisconnect}
            onSuccess={() => navigateTo(AppScreen.MASTER_DASHBOARD)}
            onBack={() => navigateTo(AppScreen.MODE_SELECTION)}
          />
        );

      case AppScreen.MASTER_DASHBOARD:
        return (
          <MasterDashboardScreen 
            config={config}
            logs={logs}
            connectedDevice={connectedDevice}
            onDisconnect={handleDisconnect}
            onUpdateConfig={(updated) => {
              setConfig(updated);
              addLog('Security Config Optimized', 'SUCCESS');
            }}
            onReset={() => {
              localStorage.removeItem(STORAGE_KEY);
              localStorage.removeItem(ONBOARDING_KEY);
              setConfig(DEFAULT_CONFIG);
              setLogs([]);
              setConnectedDevice(null);
              setHasCompletedOnboarding(false);
              navigateTo(AppScreen.WELCOME);
            }} 
            onBackToHome={() => navigateTo(AppScreen.MODE_SELECTION)}
            onClearHistory={() => setLogs([])}
          />
        );

      case AppScreen.USER_MODE:
        return (
          <UserModeScreen 
            config={config}
            isLockdown={isLockdown}
            connectedDevice={connectedDevice}
            onDisconnect={handleDisconnect}
            onAction={(action) => addLog(`User Cmd: ${action}`, 'SUCCESS')}
            onFailedAttempt={handleWrongAttempt}
            onUnlockLockdown={handleUnlockLockdown}
            onBack={() => navigateTo(AppScreen.MODE_SELECTION)}
          />
        );

      default:
        return (
          <WelcomeScreen 
            connectedDevice={connectedDevice} 
            isSetup={hasCompletedOnboarding} 
            onDisconnect={handleDisconnect} 
            onStart={() => navigateTo(AppScreen.USER_ACCESS_FLOW)} 
          />
        );
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-white overflow-hidden selection:bg-black selection:text-white">
      {renderScreen()}
    </div>
  );
};

export default App;
