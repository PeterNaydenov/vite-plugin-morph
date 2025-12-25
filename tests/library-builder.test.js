/**
 * Library Builder Tests
 * Tests for the library build functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createLibraryBuilder } from '../src/services/library-builder.js';
import { rm, access } from 'fs/promises';
import { join } from 'path';

describe('Library Builder', () => {
    const testOutputDir = 'test-output/library';

    afterEach(async () => {
        // Cleanup test output
        try {
            await rm(testOutputDir, { recursive: true, force: true });
        } catch (error) {
            // Ignore cleanup errors
        }
    });

    describe('LibraryBuilder Class', () => {
        it('should create instance with default options', () => {
            const builder = createLibraryBuilder();

            expect(builder).toBeDefined();
            expect(builder.entry).toBe('src/main.js');
            expect(builder.outputDir).toBe('dist/library');
        });

        it('should create instance with custom options', () => {
            const builder = createLibraryBuilder({
                entry: 'src/index.js',
                outputDir: 'build/lib',
                library: {
                    name: 'test-lib',
                    version: '2.0.0'
                }
            });

            expect(builder.entry).toBe('src/index.js');
            expect(builder.outputDir).toBe('build/lib');
            expect(builder.libraryConfig.name).toBe('test-lib');
            expect(builder.libraryConfig.version).toBe('2.0.0');
        });
    });

    describe('generateClientModule', () => {
        it('should generate client module code with CSS assets', () => {
            const builder = createLibraryBuilder({
                library: { name: 'test-lib' }
            });

            const cssAssets = ['assets/main.css', 'assets/components.css'];
            const themes = new Map([
                ['default', { name: 'default' }],
                ['dark', { name: 'dark' }]
            ]);

            const code = builder.generateClientModule(cssAssets, themes);

            expect(code).toContain('import css0 from');
            expect(code).toContain('import css1 from');
            expect(code).toContain('import theme_default from');
            expect(code).toContain('import theme_dark from');
            expect(code).toContain('export function applyStyles()');
            expect(code).toContain('export const themesControl');
        });

        it('should handle empty CSS assets', () => {
            const builder = createLibraryBuilder();
            const code = builder.generateClientModule([], new Map());

            expect(code).toContain('export function applyStyles()');
            expect(code).toContain('const cssAssets = []');
        });

        it('should use configured default theme', () => {
            const builder = createLibraryBuilder({
                library: { defaultTheme: 'custom' }
            });

            const themes = new Map([
                ['custom', { name: 'custom' }],
                ['other', { name: 'other' }]
            ]);

            const code = builder.generateClientModule([], themes);

            expect(code).toContain("defaultTheme: 'custom'");
        });
    });

    describe('discoverThemes', () => {
        it('should discover themes from themes directory', async () => {
            const builder = createLibraryBuilder({
                rootDir: 'examples/library-demo'
            });

            const themes = await builder.discoverThemes();

            expect(themes).toBeInstanceOf(Map);
            expect(themes.size).toBeGreaterThan(0);
        });
    });
});
