import { defineConfig } from 'vite';
import morphPlugin from '@peter.naydenov/vite-plugin-morph';

export default defineConfig({
    plugins: [morphPlugin()]
});
