/**
 * buildLibrary() option-passthrough tests
 * @fileoverview Confirms themesDir/hashMode/projectDefaultTheme reach
 * createLibraryBuilder() correctly as top-level buildLibrary() options.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/services/library-builder.js', () => ({
  createLibraryBuilder: vi.fn(() => ({ build: vi.fn().mockResolvedValue() })),
}));

import { buildLibrary } from '../src/build-library.js';
import { createLibraryBuilder } from '../src/services/library-builder.js';

describe('buildLibrary() option passthrough', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should pass a top-level themesDir straight through to createLibraryBuilder', async () => {
    await buildLibrary({
      library: { name: '@myorg/lib' },
      themesDir: 'custom/themes',
    });

    expect(createLibraryBuilder).toHaveBeenCalledWith(
      expect.objectContaining({ themesDir: 'custom/themes' })
    );
  });

  it('should pass a top-level hashMode straight through to createLibraryBuilder', async () => {
    await buildLibrary({
      library: { name: '@myorg/lib' },
      hashMode: 'production',
    });

    expect(createLibraryBuilder).toHaveBeenCalledWith(
      expect.objectContaining({ hashMode: 'production' })
    );
  });

  it('should let a top-level themesDir/hashMode override the same key nested in morphPlugin', async () => {
    await buildLibrary({
      library: { name: '@myorg/lib' },
      themesDir: 'top-level/themes',
      hashMode: 'production',
      morphPlugin: { themesDir: 'nested/themes', hashMode: 'development' },
    });

    expect(createLibraryBuilder).toHaveBeenCalledWith(
      expect.objectContaining({
        themesDir: 'top-level/themes',
        hashMode: 'production',
      })
    );
  });

  it('should still work when themesDir/hashMode are omitted entirely', async () => {
    await buildLibrary({ library: { name: '@myorg/lib' } });

    const passedOptions = createLibraryBuilder.mock.calls[0][0];
    expect(passedOptions.themesDir).toBeUndefined();
    expect(passedOptions.hashMode).toBeUndefined();
  });

  it('should derive projectDefaultTheme from morphPlugin.themes.defaultTheme', async () => {
    await buildLibrary({
      library: { name: '@myorg/lib' },
      morphPlugin: { themes: { defaultTheme: 'dark' } },
    });

    expect(createLibraryBuilder).toHaveBeenCalledWith(
      expect.objectContaining({ projectDefaultTheme: 'dark' })
    );
  });

  it('should throw when library.name is missing', async () => {
    await expect(buildLibrary({})).rejects.toThrow(
      'library.name is required for buildLibrary()'
    );
  });
});
