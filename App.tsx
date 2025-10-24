import React, { useState, useRef, useEffect, useCallback } from 'react';
import { IotStatus, MqttConnectionStatus, BrokerConfig } from './types';
import { PowerIcon, TimerIcon, FanIcon, PlusIcon, WifiIcon, SettingsIcon, MinusIcon } from './components/icons'; // Added SettingsIcon, MinusIcon

// This tells TypeScript that the 'mqtt' library is available on the global window object.
declare const mqtt: any;

// --- MQTT TOPICS ---
const TOPIC_STATUS = 'iot-home/status';
const TOPIC_CONTROL_MOTOR1 = 'iot-home/control/motor1';
const TOPIC_CONTROL_MOTOR2 = 'iot-home/control/motor2';
const TOPIC_CONTROL_TIMER_ADD = 'iot-home/control/timer/add';
const TOPIC_CONTROL_TIMER_SUB = 'iot-home/control/timer/sub'; // NEW TOPIC

// --- HELPER FUNCTIONS ---
const formatTime = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

// --- UI COMPONENTS ---
interface ConnectionManagerProps {
  connect: (config: BrokerConfig) => void;
  disconnect: () => void;
  connectionStatus: MqttConnectionStatus;
}

const ConnectionManager: React.FC<ConnectionManagerProps> = ({ connect, disconnect, connectionStatus }) => {
    // Read initial config from localStorage, or use defaults
    const getInitialConfig = (): BrokerConfig => {
        try {
            const savedConfig = localStorage.getItem('brokerConfig');
            if (savedConfig) {
                return JSON.parse(savedConfig);
            }
        } catch (error) {
            console.error("Failed to parse saved config:", error);
        }
        return {
            url: 'wss://broker.hivemq.com',
            port: '8884',
            username: '',
            password: '',
        };
    };

    const [config, setConfig] = useState<BrokerConfig>(getInitialConfig());
    const [isConnecting, setIsConnecting] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false); // Default to closed

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setConfig({ ...config, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsConnecting(true);
        localStorage.setItem('brokerConfig', JSON.stringify(config)); // Save on connect
        connect(config);
    };
    
    useEffect(() => {
        if (connectionStatus !== 'Connecting') {
            setIsConnecting(false);
        }
        if (connectionStatus === 'Connected') {
            setIsExpanded(false); // Auto-close on successful connection
        }
    }, [connectionStatus]);

    const statusText = connectionStatus === 'Connected' ? 'Device Online' : 'Device Offline';
    const statusColor = connectionStatus === 'Connected' ? 'text-green-400' : 'text-red-400';

    return (
        <div className="bg-gray-800 rounded-lg shadow-lg p-4 mb-6 transition-all duration-300">
            <div className="w-full flex justify-between items-center">
                <div className="flex items-center">
                    <span className={`w-3 h-3 rounded-full mr-3 ${connectionStatus === 'Connected' ? 'bg-green-500' : connectionStatus === 'Connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`}></span>
                    <span className={`font-bold text-lg ${statusColor}`}>{statusText}</span>
                    <span className='text-gray-500 ml-2 text-sm'>({connectionStatus})</span>
                </div>
                <button onClick={() => setIsExpanded(!isExpanded)} title="Connection Settings" className="p-2 rounded-full hover:bg-gray-700">
                    <SettingsIcon className="w-6 h-6 text-gray-400" />
                </button>
            </div>
            {isExpanded && (
                <form onSubmit={handleSubmit} className="mt-4 space-y-4 border-t border-gray-700 pt-4">
                    {/* Form inputs (unchanged) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400">Broker URL</label>
                        <input type="text" name="url" value={config.url} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="e.g., wss://broker.hivemq.com" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400">Port</label>
                        <input type="text" name="port" value={config.port} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="e.g., 8884" required />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-400">Username (Optional)</label>
                        <input type="text" name="username" value={config.username} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-400">Password (Optional)</label>
                        <input type="password" name="password" value={config.password} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div className="flex space-x-4">
                       {connectionStatus !== 'Connected' ? (
                          <button type="submit" disabled={isConnecting} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-500 disabled:cursor-not-allowed">
                               {isConnecting ? 'Connecting...' : 'Connect'}
                           </button>
                       ) : (
                           <button type="button" onClick={disconnect} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                               Disconnect
                           </button>
                       )}
                    </div>
                </form>
            )}
        </div>
    );
};

interface ControlCardProps {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
}

const ControlCard: React.FC<ControlCardProps> = ({ title, icon, children }) => {
    return (
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 flex flex-col">
            <div className="flex items-center mb-4">
                {icon}
                <h3 className="text-xl font-bold ml-3 text-gray-200">{title}</h3>
            </div>
            <div className="flex-grow flex flex-col justify-center items-center space-y-4">
                {children}
            </div>
        </div>
    );
};


// --- MAIN APP COMPONENT ---
const App: React.FC = () => {
    const [connectionStatus, setConnectionStatus] = useState<MqttConnectionStatus>('Disconnected');
    const [iotStatus, setIotStatus] = useState<IotStatus>({ motor1: 'OFF', motor2: 'OFF', timer: 0 });
    const clientRef = useRef<any | null>(null);

    const handleConnect = useCallback((config: BrokerConfig) => {
        if (clientRef.current) {
            clientRef.current.end(true);
        }

        setConnectionStatus('Connecting');
        const fullUrl = `${config.url}:${config.port}/mqtt`;
        const options = {
            clientId: `iot-dashboard-${Math.random().toString(16).substr(2, 8)}`,
            username: config.username,
            password: config.password,
            reconnectPeriod: 1000,
        };

        try {
            const client = mqtt.connect(fullUrl, options);
            clientRef.current = client;

            client.on('connect', () => {
                setConnectionStatus('Connected');
                client.subscribe(TOPIC_STATUS, (err: Error) => {
                    if (err) { console.error('Subscription error:', err); setConnectionStatus('Error'); }
                });
            });

            client.on('message', (topic: string, message: { toString: () => string }) => {
                if (topic === TOPIC_STATUS) {
                    try {
                        const statusUpdate = JSON.parse(message.toString());
                        setIotStatus(statusUpdate);
                    } catch (e) { console.error('Failed to parse status message:', e); }
                }
            });

            client.on('error', (err: Error) => { console.error('Connection error:', err); setConnectionStatus('Error'); client.end(); });
            client.on('close', () => { if (connectionStatus !== 'Disconnected') { setConnectionStatus('Error'); } });

        } catch (error) {
            console.error("MQTT connection failed to start:", error);
            setConnectionStatus('Error');
        }
    }, [connectionStatus]);

    // Auto-connect on page load if settings exist
    useEffect(() => {
        const savedConfigRaw = localStorage.getItem('brokerConfig');
        if (savedConfigRaw) {
            try {
                const savedConfig = JSON.parse(savedConfigRaw);
                handleConnect(savedConfig);
            } catch (error) {
                console.error("Could not auto-connect with saved config:", error);
            }
        }
    }, [handleConnect]);


    const handleDisconnect = () => {
        if (clientRef.current) {
            clientRef.current.end();
            clientRef.current = null;
            setConnectionStatus('Disconnected');
            setIotStatus({ motor1: 'OFF', motor2: 'OFF', timer: 0 });
        }
    };
    
    const publishCommand = useCallback((topic: string, message: string) => {
        if (clientRef.current && connectionStatus === 'Connected') {
            clientRef.current.publish(topic, message);
        } else {
            console.warn('Cannot publish command: MQTT client not connected.');
        }
    }, [connectionStatus]);
    
    const isConnected = connectionStatus === 'Connected';

    const timerProgress = Math.min(iotStatus.timer / (60 * 60), 1);
    const red = Math.round(255 * (1 - timerProgress));
    const blue = Math.round(255 * timerProgress);
    const timerColor = `rgb(${red}, 80, ${blue})`;

    return (
        <div className="min-h-screen bg-gray-900 font-sans p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="mb-8 text-center">
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">IoT Home Automation</h1>
                    <p className="mt-2 text-lg text-gray-400">Control and Monitor your ESP32 Project Remotely</p>
                </header>

                <ConnectionManager connect={handleConnect} disconnect={handleDisconnect} connectionStatus={connectionStatus} />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Motor 1 Card */}
                    <ControlCard title="Motor 1" icon={<FanIcon className="w-8 h-8 text-blue-400" />}>
                        <p className={`text-5xl font-bold ${iotStatus.motor1 === 'ON' ? 'text-green-400' : 'text-red-500'}`}>{iotStatus.motor1}</p>
                        <button onClick={() => publishCommand(TOPIC_CONTROL_MOTOR1, iotStatus.motor1 === 'ON' ? 'OFF' : 'ON')} disabled={!isConnected} className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 transform active:scale-95 ${iotStatus.motor1 === 'ON' ? 'bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/30' : 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30'} ${!isConnected && 'bg-gray-600 cursor-not-allowed'}`}><PowerIcon className="w-16 h-16 text-white" /></button>
                    </ControlCard>

                    {/* Motor 2 Card */}
                     <ControlCard title="Motor 2" icon={<FanIcon className="w-8 h-8 text-blue-400" />}>
                        <p className={`text-5xl font-bold ${iotStatus.motor2 === 'ON' ? 'text-green-400' : 'text-red-500'}`}>{iotStatus.motor2}</p>
                        <button onClick={() => publishCommand(TOPIC_CONTROL_MOTOR2, iotStatus.motor2 === 'ON' ? 'OFF' : 'ON')} disabled={!isConnected} className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 transform active:scale-95 ${iotStatus.motor2 === 'ON' ? 'bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/30' : 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30'} ${!isConnected && 'bg-gray-600 cursor-not-allowed'}`}><PowerIcon className="w-16 h-16 text-white" /></button>
                    </ControlCard>

                    {/* Timer Card */}
                    <ControlCard title="Master Timer" icon={<TimerIcon className="w-8 h-8 text-blue-400" />}>
                       <div className="w-full text-center p-4 rounded-lg transition-colors duration-500" style={{ backgroundColor: iotStatus.timer > 0 ? timerColor : 'transparent' }}>
                         <p className="text-6xl font-mono tracking-widest text-white">{formatTime(iotStatus.timer)}</p>
                       </div>
                       <div className="flex w-full space-x-4">
                            <button onClick={() => publishCommand(TOPIC_CONTROL_TIMER_SUB, '5')} disabled={!isConnected} className="flex items-center justify-center w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-md transition-transform transform active:scale-95 disabled:bg-gray-600 disabled:cursor-not-allowed">
                                <MinusIcon className="w-6 h-6 mr-2" />
                                <span>Sub 5 Mins</span>
                            </button>
                            <button onClick={() => publishCommand(TOPIC_CONTROL_TIMER_ADD, '5')} disabled={!isConnected} className="flex items-center justify-center w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transition-transform transform active:scale-95 disabled:bg-gray-600 disabled:cursor-not-allowed">
                                <PlusIcon className="w-6 h-6 mr-2" />
                                <span>Add 5 Mins</span>
                            </button>
                       </div>
                    </ControlCard>
                </div>
                
                 {/* Status Footer */}
                <footer className="mt-8 text-center text-gray-500 text-sm">
                    <div className="flex items-center justify-center space-x-2">
                        <WifiIcon className={`w-5 h-5 ${connectionStatus === 'Connected' ? 'text-green-500' : connectionStatus === 'Connecting' ? 'text-yellow-500 animate-pulse' : 'text-red-500'}`}/>
                        <span>Connection Status: <strong>{connectionStatus}</strong></span>
                    </div>
                    <p className="mt-2">Waiting for ESP32 status updates on topic: <code className="bg-gray-700 text-xs p-1 rounded">{TOPIC_STATUS}</code></p>
                </footer>
            </div>
        </div>
    );
};

export default App;