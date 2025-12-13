
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from "url";
import tailwindcss from '@tailwindcss/vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
    plugins: [
        react(),
        // tailwindcss(),
    ],
    resolve: {
        extensions: [".js", ".jsx", ".ts", ".tsx", ".json"],
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    build: {
        target: 'esnext',
        outDir: 'build_debug',
        cssCodeSplit: false,
        sourcemap: false,
        minify: false,
        rollupOptions: {
            input: {
                main: path.resolve(__dirname, 'index_debug.html'),
            },
        },
    },
});
