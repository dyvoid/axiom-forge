import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
	plugins: [react()],
	server: {
		host: '127.0.0.1',
		// Not Vite's 5173 default: on Windows a second process can bind an
		// already-listening port, so sharing the default with another local
		// Vite project silently routes requests to whichever won the race.
		port: 5273,
		strictPort: true,
		proxy: {
			'/api': {
				target: 'http://127.0.0.1:3000',
				changeOrigin: false,
			},
		},
	},
});
