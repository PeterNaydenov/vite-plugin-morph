/**
 * Logger Tests
 * @fileoverview Confirms log levels filter output and 'silent' suppresses everything.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configure, debug, info, warn, error } from '../../src/utils/logger.js';

describe('logger levels', () => {
  let spies;

  beforeEach(() => {
    spies = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    configure({ level: 'info' });
  });

  const emitAll = () => {
    debug('d');
    info('i');
    warn('w');
    error('e');
  };

  it('should hide debug output at the default info level', () => {
    configure({ level: 'info' });
    emitAll();

    expect(spies.log).toHaveBeenCalledTimes(1); // info only
    expect(spies.warn).toHaveBeenCalledTimes(1);
    expect(spies.error).toHaveBeenCalledTimes(1);
  });

  it('should show debug output at the debug level', () => {
    configure({ level: 'debug' });
    emitAll();

    expect(spies.log).toHaveBeenCalledTimes(2); // debug + info
  });

  it('should only show errors at the error level', () => {
    configure({ level: 'error' });
    emitAll();

    expect(spies.log).not.toHaveBeenCalled();
    expect(spies.warn).not.toHaveBeenCalled();
    expect(spies.error).toHaveBeenCalledTimes(1);
  });

  it('should print nothing at the silent level', () => {
    configure({ level: 'silent' });
    emitAll();

    expect(spies.log).not.toHaveBeenCalled();
    expect(spies.warn).not.toHaveBeenCalled();
    expect(spies.error).not.toHaveBeenCalled();
  });

  it('should reject an unknown level', () => {
    expect(() => configure({ level: 'verbose' })).toThrow(/Invalid log level/);
  });
});
