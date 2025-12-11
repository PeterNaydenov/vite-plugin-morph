/**
 * File Watcher Tests
 * @fileoverview Comprehensive tests for file watching functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FileWatcher } from '../../src/utils/file-watcher.js';

const { watch: watchMock } = vi.hoisted(() => ({
  watch: vi.fn(),
}));

vi.mock('fs', () => ({
  watch: watchMock,
}));

describe('File Watcher', () => {
  let fileWatcher;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    fileWatcher = new FileWatcher();
  });

  afterEach(() => {
    if (fileWatcher) {
      fileWatcher.stopAll();
    }
    vi.useRealTimers();
  });

  describe('Constructor', () => {
    it('should create file watcher with default options', () => {
      expect(fileWatcher.debounceTimers).toBeDefined();
      expect(fileWatcher.debounceTimers instanceof Map).toBe(true);
      expect(fileWatcher.watchers).toBeDefined();
      expect(fileWatcher.watchers instanceof Map).toBe(true);
    });

    it('should create file watcher with custom options', () => {
      const options = {
        debounceMs: 500,
        persistent: true,
      };

      const watcher = new FileWatcher(options);

      expect(watcher.options.debounceMs).toBe(500);
      expect(watcher.options.persistent).toBe(true);
    });
  });

  describe('watchFile', () => {
    it('should watch a single file', () => {
      const callback = vi.fn();
      const mockWatcher = {
        on: vi.fn(),
        close: vi.fn(),
      };
      watchMock.mockReturnValue(mockWatcher);

      const unwatch = fileWatcher.watchFile('test.morph', callback);
      expect(watchMock).toHaveBeenCalledWith(
        'test.morph',
        expect.any(Object),
        expect.any(Function)
      );
      expect(typeof unwatch).toBe('function');
    });

    it('should watch file with custom options', () => {
      const options = { persistent: true };
      const callback = vi.fn();
      const mockWatcher = {
        on: vi.fn(),
        close: vi.fn(),
      };
      watchMock.mockReturnValue(mockWatcher);

      const unwatch = fileWatcher.watchFile('test.morph', callback, options);
      expect(watchMock).toHaveBeenCalledWith(
        'test.morph',
        { recursive: false },
        expect.any(Function)
      );
      expect(typeof unwatch).toBe('function');
    });

    it('should handle watch errors gracefully', () => {
      watchMock.mockImplementation(() => {
        throw new Error('Watch failed');
      });

      const callback = vi.fn();
      const unwatch = fileWatcher.watchFile('test.morph', callback);

      expect(unwatch).toBeDefined();
      expect(typeof unwatch).toBe('function');
    });

    it('should return unwatch function that cleans up', () => {
      const mockWatcher = {
        on: vi.fn(),
        close: vi.fn(),
      };
      watchMock.mockReturnValue(mockWatcher);

      const callback = vi.fn();
      const unwatch = fileWatcher.watchFile('test.morph', callback);

      // Call unwatch
      unwatch();

      expect(mockWatcher.close).toHaveBeenCalled();
    });
  });

  describe('watchDirectory', () => {
    it('should watch directory with pattern', () => {
      const callback = vi.fn();
      const mockWatcher = {
        on: vi.fn(),
        close: vi.fn(),
      };
      watchMock.mockReturnValue(mockWatcher);

      const unwatch = fileWatcher.watchDirectory('src', '*.morph', callback);

      expect(watchMock).toHaveBeenCalledWith(
        'src',
        expect.any(Object),
        expect.any(Function)
      );
      expect(typeof unwatch).toBe('function');
    });

    it('should watch directory with multiple patterns', () => {
      const callback = vi.fn();
      const mockWatcher = {
        on: vi.fn(),
        close: vi.fn(),
      };
      watchMock.mockReturnValue(mockWatcher);

      const patterns = ['*.morph', '*.css'];
      const unwatch = fileWatcher.watchDirectory('src', patterns, callback);

      expect(watchMock).toHaveBeenCalledWith(
        'src',
        expect.any(Object),
        expect.any(Function)
      );
      expect(typeof unwatch).toBe('function');
    });

    it('should handle directory watch errors', () => {
      watchMock.mockImplementation(() => {
        throw new Error('Directory watch failed');
      });

      const callback = vi.fn();
      const unwatch = fileWatcher.watchDirectory('src', '*.morph', callback);

      expect(typeof unwatch).toBe('function');
    });
  });

  describe('File Change Events', () => {
    it('should handle file change events', () => {
      const callback = vi.fn();
      const mockWatcher = {
        on: vi.fn(),
        close: vi.fn(),
      };
      watchMock.mockReturnValue(mockWatcher);

      fileWatcher.watchFile('test.morph', callback);

      // Get the callback from the watch call
      const watchCall = watchMock.mock.calls[0];
      const changeCallback = watchCall[2]; // Third argument is the callback

      // Simulate file change event
      changeCallback('change', 'test.morph');
      vi.advanceTimersByTime(300);

      expect(callback).toHaveBeenCalledWith({
        eventType: 'change',
        filename: 'test.morph',
        path: 'test.morph',
      });
    });

    it('should debounce file changes', () => {
      const callback = vi.fn();
      const mockWatcher = {
        on: vi.fn(),
        close: vi.fn(),
      };
      watchMock.mockReturnValue(mockWatcher);

      fileWatcher.watchFile('test.morph', callback);

      // Simulate file change event
      const changeCallback = watchMock.mock.calls[0][2];

      // Trigger multiple rapid changes
      changeCallback('change', 'test.morph');
      changeCallback('change', 'test.morph');
      changeCallback('change', 'test.morph');

      // Should not call callback immediately due to debouncing
      expect(callback).not.toHaveBeenCalled();

      // Process events
      vi.runAllTimers();

      // Now callback should be called once
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should handle different event types', () => {
      const callback = vi.fn();
      const mockWatcher = {
        on: vi.fn(),
        close: vi.fn(),
      };
      watchMock.mockReturnValue(mockWatcher);

      fileWatcher.watchFile('test.morph', callback);

      // Test different event types
      const changeCallback = watchMock.mock.calls[0][2];
      changeCallback('rename', 'test.morph');
      vi.advanceTimersByTime(300);

      expect(callback).toHaveBeenCalledWith({
        eventType: 'rename',
        filename: 'test.morph',
        path: 'test.morph',
      });
    });

    it('should handle files in subdirectories', () => {
      const callback = vi.fn();
      const mockWatcher = {
        on: vi.fn(),
        close: vi.fn(),
      };
      watchMock.mockReturnValue(mockWatcher);

      fileWatcher.watchDirectory('src', '*.morph', callback);

      // Test files in subdirectories
      const changeCallback = watchMock.mock.calls[0][2];
      changeCallback('change', 'components/button.morph');
      vi.advanceTimersByTime(300);

      expect(callback).toHaveBeenCalledWith({
        eventType: 'change',
        filename: 'components/button.morph',
        path: 'src',
      });
    });
  });

  describe('Pattern Matching', () => {
    it.skip('should match files by extension', () => {
      const callback = vi.fn();
      const mockWatcher = {
        on: vi.fn(),
        close: vi.fn(),
      };
      watchMock.mockReturnValue(mockWatcher);

      fileWatcher.watchDirectory('src', '*.morph', callback);

      const changeCallback = watchMock.mock.calls[0][2];

      // Matching file
      changeCallback('change', 'test.morph');
      vi.advanceTimersByTime(300);

      expect(callback).toHaveBeenCalledTimes(1);

      // Non-matching file
      changeCallback('change', 'test.js');
      vi.advanceTimersByTime(300);

      expect(callback).toHaveBeenCalledTimes(1); // Should not increase
    });

    it.skip('should handle multiple patterns', () => {
      const callback = vi.fn();
      const mockWatcher = {
        on: vi.fn(),
        close: vi.fn(),
      };
      watchMock.mockReturnValue(mockWatcher);

      fileWatcher.watchDirectory('src', ['*.morph', '*.css'], callback);

      const changeCallback = watchMock.mock.calls[0][2];

      // First pattern match
      changeCallback('change', 'test.morph');
      vi.advanceTimersByTime(300);

      expect(callback).toHaveBeenCalledTimes(1);

      // Second pattern match
      changeCallback('change', 'test.css');
      vi.advanceTimersByTime(300);

      expect(callback).toHaveBeenCalledTimes(2);

      // Non-matching file
      changeCallback('change', 'test.js');
      vi.advanceTimersByTime(300);

      expect(callback).toHaveBeenCalledTimes(2); // Should not increase
    });
  });

  describe('Multiple Watchers', () => {
    it('should handle multiple file watchers', () => {
      const mockWatcher1 = { on: vi.fn(), close: vi.fn() };
      const mockWatcher2 = { on: vi.fn(), close: vi.fn() };
      watchMock
        .mockReturnValueOnce(mockWatcher1)
        .mockReturnValueOnce(mockWatcher2);

      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const unwatch1 = fileWatcher.watchFile('file1.morph', callback1);
      const unwatch2 = fileWatcher.watchFile('file2.morph', callback2);

      expect(watchMock).toHaveBeenCalledTimes(2);
      expect(typeof unwatch1).toBe('function');
      expect(typeof unwatch2).toBe('function');
    });
  });

  describe('Cleanup', () => {
    it('should dispose all watchers', () => {
      const mockWatcher1 = { on: vi.fn(), close: vi.fn() };
      const mockWatcher2 = { on: vi.fn(), close: vi.fn() };
      watchMock
        .mockReturnValueOnce(mockWatcher1)
        .mockReturnValueOnce(mockWatcher2);

      fileWatcher.watchFile('file1.morph', vi.fn());
      fileWatcher.watchFile('file2.morph', vi.fn());

      fileWatcher.stopAll();

      expect(mockWatcher1.close).toHaveBeenCalled();
      expect(mockWatcher2.close).toHaveBeenCalled();
      expect(fileWatcher.watchers.size).toBe(0);
      expect(fileWatcher.debounceTimers.size).toBe(0);
    });

    it('should clear debounce timers on dispose', () => {
      const mockWatcher = {
        on: vi.fn(),
        close: vi.fn(),
      };
      watchMock.mockReturnValue(mockWatcher);

      const callback = vi.fn();
      fileWatcher.watchFile('test.morph', callback);

      // Trigger a change to create a timer
      const changeCallback = watchMock.mock.calls[0][2];
      changeCallback('change', 'test.morph');

      // Should have a timer
      expect(fileWatcher.debounceTimers.size).toBe(1);

      // Dispose should clear timers
      fileWatcher.stopAll();

      expect(fileWatcher.debounceTimers.size).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle callback errors gracefully', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Callback error');
      });

      const mockWatcher = {
        on: vi.fn(),
        close: vi.fn(),
      };
      watchMock.mockReturnValue(mockWatcher);

      fileWatcher.watchFile('test.morph', errorCallback);

      const changeCallback = watchMock.mock.calls[0][2];

      // Should not throw when callback errors
      expect(() => {
        changeCallback('change', 'test.morph');
        vi.advanceTimersByTime(300);
      }).not.toThrow();
    });

    it('should handle watcher close errors', () => {
      const mockWatcher = {
        on: vi.fn(),
        close: vi.fn(() => {
          throw new Error('Close error');
        }),
      };
      watchMock.mockReturnValue(mockWatcher);

      const unwatch = fileWatcher.watchFile('test.morph', vi.fn());

      // Should not throw when close errors
      expect(() => {
        unwatch();
      }).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should handle many file changes efficiently', () => {
      const callback = vi.fn();
      const mockWatcher = {
        on: vi.fn(),
        close: vi.fn(),
      };
      watchMock.mockReturnValue(mockWatcher);

      fileWatcher.watchFile('test.morph', callback);

      // Trigger many rapid changes
      const changeCallback = watchMock.mock.calls[0][2];
      for (let i = 0; i < 100; i++) {
        changeCallback('change', 'test.morph');
      }

      // Should only call callback once after debounce
      vi.advanceTimersByTime(300);

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should handle many watchers efficiently', () => {
      const mockWatchers = Array.from({ length: 100 }, () => ({
        on: vi.fn(),
        close: vi.fn(),
      }));
      watchMock.mockImplementation(() => {
        return mockWatchers.shift();
      });

      // Create many watchers
      const unwatchFunctions = [];
      for (let i = 0; i < 100; i++) {
        unwatchFunctions.push(fileWatcher.watchFile(`file${i}.morph`, vi.fn()));
      }

      expect(watchMock).toHaveBeenCalledTimes(100);
      expect(fileWatcher.watchers.size).toBe(100);

      // Dispose should clean up all efficiently
      const startTime = Date.now();
      fileWatcher.stopAll();
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // Should complete quickly
      expect(fileWatcher.watchers.size).toBe(0);
    });
  });

  describe('Integration', () => {
    it('should handle complete watch workflow', () => {
      const callback = vi.fn();
      const mockWatcher = {
        on: vi.fn(),
        close: vi.fn(),
      };
      watchMock.mockReturnValue(mockWatcher);

      const unwatch = fileWatcher.watchFile('test.morph', callback);

      // Simulate file change workflow
      const changeCallback = watchMock.mock.calls[0][2];

      // File changes multiple times rapidly
      changeCallback('change', 'test.morph');
      changeCallback('change', 'test.morph');
      changeCallback('change', 'test.morph');

      // Debounced callback should fire once
      vi.advanceTimersByTime(300);
      expect(callback).toHaveBeenCalledTimes(1);

      // File changes again
      changeCallback('change', 'test.morph');
      vi.advanceTimersByTime(300);
      expect(callback).toHaveBeenCalledTimes(2);

      // Cleanup
      unwatch();
      expect(mockWatcher.close).toHaveBeenCalled();
    });
  });
});
