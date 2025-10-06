import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

export default defineConfig({
	site: 'https://idleberg.github.io',
	base: '/playdate-sdk-feed/',
	output: 'static',
	vite: {
		plugins: [tailwindcss()],
	},
});
