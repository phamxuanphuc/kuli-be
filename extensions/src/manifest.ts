import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  manifest_version: 3,
  name: 'Kuli Utility Hub',
  version: '0.1.0',
  description: 'Collect page content and generate multiple-choice questions with OpenAI.',
  action: {
    default_title: 'Kuli Utility Hub',
    default_popup: 'index.html',
  },
  permissions: ['activeTab', 'scripting', 'storage'],
  host_permissions: ['<all_urls>', 'https://api.openai.com/*', 'http://127.0.0.1:8000/*', 'https://kuli-be.vercel.app/*'],
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/contentScript.ts'],
      run_at: 'document_idle',
    },
  ],
})
