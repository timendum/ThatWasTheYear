import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  base: process.env.GITHUB_REPOSITORY
    ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/`
    : '/',
  plugins: [react()],
}))