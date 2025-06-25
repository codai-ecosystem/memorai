'use client';

import { useState } from 'react';
import { Plus, Save, X, Tag, Brain, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { useMemoryStore } from '../../stores/memory-store';
import { cn } from '../../lib/utils';

interface MemoryActionsProps {
  className?: string;
}

export function MemoryActions({ className }: MemoryActionsProps) {
  const [isAddingMemory, setIsAddingMemory] = useState(false);
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [type, setType] = useState<
    | 'conversation'
    | 'document'
    | 'note'
    | 'thread'
    | 'task'
    | 'personality'
    | 'emotion'
  >('note');
  const [importance, setImportance] = useState(0.5);

  const { addMemory, isLoading } = useMemoryStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      toast.error('Content is required');
      return;
    }

    try {
      await addMemory(content, {
        tags: tags
          .split(',')
          .map(tag => tag.trim())
          .filter(Boolean),
        importance,
        source: 'dashboard',
      });

      // Reset form
      setContent('');
      setTags('');
      setImportance(0.5);
      setIsAddingMemory(false);

      toast.success('Memory added successfully!');
    } catch (error) {
      toast.error('Failed to add memory');
    }
  };

  const quickActions = [
    {
      id: 'add-memory',
      label: 'Add Memory',
      icon: Plus,
      description: 'Create a new memory entry',
      onClick: () => setIsAddingMemory(true),
    },
    {
      id: 'bulk-import',
      label: 'Bulk Import',
      icon: FileText,
      description: 'Import memories from file',
      onClick: () => toast('Bulk import feature coming soon!'),
    },
    {
      id: 'ai-assist',
      label: 'AI Assist',
      icon: Brain,
      description: 'Get AI suggestions for memory organization',
      onClick: () => toast('AI assist feature coming soon!'),
    },
  ];

  return (
    <div
      data-testid="memory-actions"
      className={cn('p-6 space-y-6', className)}
    >
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Memory Actions
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Create, manage, and organize your memories
        </p>
      </div>{' '}
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
        {quickActions.map(action => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={action.onClick}
              data-testid={`quick-action-${action.id}`}
              className={cn(
                'p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700',
                'hover:border-blue-300 dark:hover:border-blue-600 transition-colors',
                'text-left group relative z-10 pointer-events-auto'
              )}
            >
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                  <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {action.label}
                </h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {action.description}
              </p>
            </button>
          );
        })}
      </div>{' '}
      {/* Add Memory Form */}
      {isAddingMemory && (
        <div
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 relative z-20"
          data-testid="memory-form-container"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Add New Memory
            </h3>{' '}
            <button
              onClick={() => setIsAddingMemory(false)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              data-testid="close-form-button"
              aria-label="Close form"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-4"
            role="form"
            data-testid="memory-form"
          >
            {/* Content */}
            <div>
              <label
                htmlFor="memory-content"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Content *
              </label>
              <textarea
                id="memory-content"
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Enter memory content..."
                rows={4}
                className={cn(
                  'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg',
                  'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                  'bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
                  'placeholder-gray-500 dark:placeholder-gray-400'
                )}
                required
              />
            </div>

            {/* Type */}
            <div>
              <label
                htmlFor="memory-type"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Type
              </label>
              <select
                id="memory-type"
                value={type}
                onChange={e => setType(e.target.value as any)}
                className={cn(
                  'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg',
                  'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                  'bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                )}
              >
                <option value="note">Note</option>
                <option value="task">Task</option>
                <option value="conversation">Conversation</option>
                <option value="document">Document</option>
                <option value="thread">Thread</option>
                <option value="personality">Personality</option>
                <option value="emotion">Emotion</option>
              </select>
            </div>

            {/* Tags */}
            <div>
              <label
                htmlFor="memory-tags"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Tags
              </label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="memory-tags"
                  type="text"
                  value={tags}
                  onChange={e => setTags(e.target.value)}
                  placeholder="tag1, tag2, tag3..."
                  className={cn(
                    'w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg',
                    'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                    'bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
                    'placeholder-gray-500 dark:placeholder-gray-400'
                  )}
                />
              </div>
            </div>

            {/* Importance */}
            <div>
              <label
                htmlFor="memory-importance"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Importance: {Math.round(importance * 100)}%
              </label>
              <input
                id="memory-importance"
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={importance}
                onChange={e => setImportance(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Actions */}
            <div className="flex space-x-3 pt-4">
              {' '}
              <button
                type="submit"
                disabled={isLoading}
                data-testid="submit-memory-button"
                className={cn(
                  'flex-1 flex items-center justify-center space-x-2',
                  'px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400',
                  'text-white rounded-lg transition-colors font-medium'
                )}
              >
                <Save className="h-4 w-4" />
                <span>{isLoading ? 'Adding...' : 'Add Memory'}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsAddingMemory(false)}
                className={cn(
                  'px-4 py-2 border border-gray-300 dark:border-gray-600',
                  'text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700',
                  'transition-colors'
                )}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
