'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
  Save,
  RefreshCcw,
  AlertTriangle,
  CheckCircle,
  Server,
  Database,
  Shield,
  Zap,
  Settings,
  HardDrive,
  Network,
  Eye,
  EyeOff,
  TestTube,
  Download,
  Upload,
} from 'lucide-react';

import { useConfigStore, SystemConfig } from '../../stores/config-store';
import { cn } from '../../lib/utils';

interface SystemConfigurationProps {
  className?: string;
}

export function SystemConfiguration({ className }: SystemConfigurationProps) {
  const { config, isLoading, updateConfig, fetchConfig, testConnection } =
    useConfigStore();
  const [localConfig, setLocalConfig] = useState(config);
  const [showSecrets, setShowSecrets] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    void console.log(
      'SystemConfiguration: Component mounted, fetching config...'
    );
    void fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    console.log('SystemConfiguration: Config updated:', config);
    setLocalConfig(config);
    setHasChanges(false);
  }, [config]);

  const handleConfigChange = (
    section: keyof SystemConfig,
    key: string,
    value: any
  ) => {
    setLocalConfig(prev => {
      if (!prev) {
        return prev;
      }

      const updatedSection = { ...(prev[section] as any), [key]: value };

      return {
        ...prev,
        [section]: updatedSection,
      };
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!localConfig) {
      return;
    }

    setSaving(true);
    try {
      await updateConfig(localConfig);
      setHasChanges(false);
      toast.success('Configuration saved successfully');
    } catch (error) {
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const result = await testConnection();
      if (result.success) {
        toast.success('Connection test successful');
      } else {
        toast.error(`Connection test failed: ${result.error}`);
      }
    } catch (error) {
      toast.error('Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  const handleReset = (): void => {
    setLocalConfig(config);
    setHasChanges(false);
    toast.success('Configuration reset to saved values');
  };

  const exportConfig = (): void => {
    if (!localConfig) {
      return;
    }
    const configData = {
      ...localConfig,
      // Remove sensitive data
      memory: {
        ...localConfig.memory,
        openaiApiKey: '***REDACTED***',
      },
      ...(localConfig.database && {
        database: {
          ...localConfig.database,
          password: '***REDACTED***',
        },
      }),
    };

    const blob = new Blob([JSON.stringify(configData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'memorai-config.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importConfig = (): void => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e): void => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e): void => {
          try {
            const importedConfig = JSON.parse(e.target?.result as string);
            setLocalConfig(importedConfig);
            setHasChanges(true);
            toast.success('Configuration imported successfully');
          } catch (error) {
            toast.error('Failed to parse configuration file');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  if (isLoading || !localConfig) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="p-6 border rounded-lg">
          <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-4 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div data-testid="system-config" className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            System Configuration
          </h2>
          <p className="text-gray-600">
            Manage memory engine and system settings
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSecrets(!showSecrets)}
            className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            {showSecrets ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            {showSecrets ? 'Hide' : 'Show'} Secrets
          </button>

          <button
            onClick={importConfig}
            className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Upload className="h-4 w-4" />
            Import
          </button>

          <button
            onClick={exportConfig}
            className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export
          </button>

          <button
            onClick={handleTest}
            disabled={testing}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <TestTube className={cn('h-4 w-4', testing && 'animate-pulse')} />
            Test Connection
          </button>
        </div>
      </div>

      {/* Status bar */}
      {hasChanges && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <span className="text-amber-800">You have unsaved changes</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="px-3 py-1 text-amber-700 hover:bg-amber-100 rounded transition-colors"
            >
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-3 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors disabled:opacity-50"
            >
              <Save className={cn('h-4 w-4', saving && 'animate-pulse')} />
              Save Changes
            </button>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Memory Engine Configuration */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 border rounded-lg bg-white"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Server className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Memory Engine</h3>
              <p className="text-sm text-gray-600">
                Core memory processing settings
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Provider
              </label>
              <select
                value={localConfig.memory?.provider ?? 'openai'}
                onChange={e =>
                  handleConfigChange('memory', 'provider', e.target.value)
                }
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="openai">OpenAI</option>
                <option value="azure">Azure OpenAI</option>
                <option value="local">Local Model</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Model
              </label>
              <input
                type="text"
                value={localConfig.memory?.model || 'gpt-4'}
                onChange={e =>
                  handleConfigChange('memory', 'model', e.target.value)
                }
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., gpt-4, gpt-3.5-turbo"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Key
              </label>
              <input
                type={showSecrets ? 'text' : 'password'}
                value={localConfig.memory?.openaiApiKey || ''}
                onChange={e =>
                  handleConfigChange('memory', 'openaiApiKey', e.target.value)
                }
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={showSecrets ? 'Enter API key' : '••••••••••••••••'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Memories per Query
              </label>
              <input
                type="number"
                value={localConfig.memory?.maxMemories || 10}
                onChange={e =>
                  handleConfigChange(
                    'memory',
                    'maxMemories',
                    parseInt(e.target.value)
                  )
                }
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="1"
                max="100"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="enableMemoryCache"
                checked={localConfig.memory?.enableCache || false}
                onChange={e =>
                  handleConfigChange('memory', 'enableCache', e.target.checked)
                }
                className="rounded"
              />
              <label
                htmlFor="enableMemoryCache"
                className="text-sm text-gray-700"
              >
                Enable memory caching
              </label>
            </div>
          </div>
        </motion.div>

        {/* Database Configuration */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 border rounded-lg bg-white"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-100 rounded-lg">
              <Database className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Vector Database</h3>
              <p className="text-sm text-gray-600">
                Vector storage and retrieval
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Database Type
              </label>
              <select
                value={localConfig.database?.type ?? 'qdrant'}
                onChange={e =>
                  handleConfigChange('database', 'type', e.target.value)
                }
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="qdrant">Qdrant</option>
                <option value="pinecone">Pinecone</option>
                <option value="weaviate">Weaviate</option>
                <option value="chroma">ChromaDB</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Host URL
              </label>
              <input
                type="text"
                value={localConfig.database?.host || 'http://localhost:6333'}
                onChange={e =>
                  handleConfigChange('database', 'host', e.target.value)
                }
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., http://localhost:6333"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Collection Name
              </label>
              <input
                type="text"
                value={localConfig.database?.collection ?? 'memories'}
                onChange={e =>
                  handleConfigChange('database', 'collection', e.target.value)
                }
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., memories"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vector Dimensions
              </label>
              <input
                type="number"
                value={localConfig.database?.dimensions || 1536}
                onChange={e =>
                  handleConfigChange(
                    'database',
                    'dimensions',
                    parseInt(e.target.value)
                  )
                }
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="128"
                max="4096"
              />
            </div>
          </div>
        </motion.div>

        {/* Security Configuration */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 border rounded-lg bg-white"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-red-100 rounded-lg">
              <Shield className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Security</h3>
              <p className="text-sm text-gray-600">
                Authentication and encryption
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="enableEncryption"
                checked={localConfig.security?.enableEncryption || false}
                onChange={e =>
                  handleConfigChange(
                    'security',
                    'enableEncryption',
                    e.target.checked
                  )
                }
                className="rounded"
              />
              <label
                htmlFor="enableEncryption"
                className="text-sm text-gray-700"
              >
                Enable memory encryption
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Encryption Key
              </label>
              <input
                type={showSecrets ? 'text' : 'password'}
                value={localConfig.security?.encryptionKey || ''}
                onChange={e =>
                  handleConfigChange(
                    'security',
                    'encryptionKey',
                    e.target.value
                  )
                }
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={
                  showSecrets
                    ? '32-character encryption key'
                    : '••••••••••••••••'
                }
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="enableAuditLog"
                checked={localConfig.security?.enableAuditLog || false}
                onChange={e =>
                  handleConfigChange(
                    'security',
                    'enableAuditLog',
                    e.target.checked
                  )
                }
                className="rounded"
              />
              <label htmlFor="enableAuditLog" className="text-sm text-gray-700">
                Enable audit logging
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Session Timeout (minutes)
              </label>
              <input
                type="number"
                value={localConfig.security?.sessionTimeout || 60}
                onChange={e =>
                  handleConfigChange(
                    'security',
                    'sessionTimeout',
                    parseInt(e.target.value)
                  )
                }
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="5"
                max="1440"
              />
            </div>
          </div>
        </motion.div>

        {/* Performance Configuration */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-6 border rounded-lg bg-white"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Zap className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Performance</h3>
              <p className="text-sm text-gray-600">Optimization and caching</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Query Timeout (seconds)
              </label>
              <input
                type="number"
                value={localConfig.performance?.queryTimeout || 30}
                onChange={e =>
                  handleConfigChange(
                    'performance',
                    'queryTimeout',
                    parseInt(e.target.value)
                  )
                }
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="5"
                max="300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cache Size (MB)
              </label>
              <input
                type="number"
                value={localConfig.performance?.cacheSize || 100}
                onChange={e =>
                  handleConfigChange(
                    'performance',
                    'cacheSize',
                    parseInt(e.target.value)
                  )
                }
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="10"
                max="1000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Batch Size
              </label>
              <input
                type="number"
                value={localConfig.performance?.batchSize || 50}
                onChange={e =>
                  handleConfigChange(
                    'performance',
                    'batchSize',
                    parseInt(e.target.value)
                  )
                }
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="1"
                max="1000"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="enablePreloading"
                checked={localConfig.performance?.enablePreloading || false}
                onChange={e =>
                  handleConfigChange(
                    'performance',
                    'enablePreloading',
                    e.target.checked
                  )
                }
                className="rounded"
              />
              <label
                htmlFor="enablePreloading"
                className="text-sm text-gray-700"
              >
                Enable memory preloading
              </label>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Save button */}
      {hasChanges && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-end gap-3 pt-6 border-t"
        >
          <button
            onClick={handleReset}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            Reset Changes
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <RefreshCcw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Configuration
          </button>
        </motion.div>
      )}
    </div>
  );
}
