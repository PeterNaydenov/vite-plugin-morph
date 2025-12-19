
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeDiscovery } from '../../src/services/theme-discovery.js';
import * as path from 'path';

// Mock fs/promises
vi.mock('fs/promises', () => ({
    readFile: vi.fn(),
    readdir: vi.fn(),
    stat: vi.fn()
}));

import { readFile, readdir, stat } from 'fs/promises';

describe('Theme Discovery - CSS Support', () => {
    let discovery;
    const mockFiles = {};

    beforeEach(() => {
        vi.clearAllMocks();

        // Clear mock file system object
        for (const key in mockFiles) delete mockFiles[key];

        discovery = new ThemeDiscovery({
            directories: ['/themes']
        });

        // Setup default mock implementations
        readdir.mockImplementation(async (dir) => {
            // Find files that are in the requested directory
            // For simplicity in this mock, we assume flat structure in mockFiles keys
            const files = Object.keys(mockFiles)
                .filter(f => f.startsWith(dir) && f !== dir)
                .map(f => {
                    const name = path.basename(f);
                    return {
                        name,
                        isFile: () => true,
                        isDirectory: () => false
                    };
                });
            return files;
        });

        readFile.mockImplementation(async (filepath) => {
            if (mockFiles[filepath]) return mockFiles[filepath];
            throw new Error(`ENOENT: no such file or directory, open '${filepath}'`);
        });

        stat.mockImplementation(async (filepath) => {
            if (mockFiles[filepath]) {
                return { mtime: { getTime: () => 12345 } };
            }
            throw new Error(`ENOENT: no such file or directory, stat '${filepath}'`);
        });
    });

    it('should discover and parse a .css theme file', async () => {
        const filePath = '/themes/dark.css';
        mockFiles[filePath] = `
        :root {
          --color-bg: #000;
          --color-text: #fff;
        }
    `;

        const themes = await discovery.discoverThemes();

        expect(themes.has('dark')).toBe(true);

        const theme = themes.get('dark');
        expect(theme.name).toBe('dark');
        expect(theme.variables).toEqual({
            '--color-bg': '#000',
            '--color-text': '#fff'
        });
    });

    it('should ignore non-variable properties in :root', async () => {
        const filePath = '/themes/mixed.css';
        mockFiles[filePath] = `
        :root {
          --valid-var: 10px;
          display: block; /* Should be ignored */
          --another-var: red;
        }
        body {
           color: red;
        }
    `;

        const themes = await discovery.discoverThemes();
        const theme = themes.get('mixed');

        expect(theme.variables).toEqual({
            '--valid-var': '10px',
            '--another-var': 'red'
        });
        // Ensure 'display' was not added as a variable
        expect(theme.variables['display']).toBeUndefined();
    });

    it('should handle values with colons correctly', async () => {
        const filePath = '/themes/complex.css';
        mockFiles[filePath] = `
        :root {
          --bg-image: url('https://example.com/img.jpg');
        }
      `;

        const themes = await discovery.discoverThemes();
        const theme = themes.get('complex');

        expect(theme.variables).toEqual({
            '--bg-image': "url('https://example.com/img.jpg')"
        });
    });
});
