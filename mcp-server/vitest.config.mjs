import { defineConfig } from 'vitest/config';
export default defineConfig({
    test: {
        include: ['tests/**/*.test.ts'],
        setupFiles: ['./tests/vitest.setup.ts'],
        globals: true,
        threads: false,
        testTimeout: 15000, // Docker pull on first run
        hookTimeout: 30000
    },
});
