import { resolve } from 'path';
import { defineConfig } from 'vite';

const root = resolve(__dirname);

export default defineConfig({
  root,
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        // 日本語版
        home: resolve(root, 'index.html'),
        about: resolve(root, 'about.html'),
        business: resolve(root, 'business.html'),
        history: resolve(root, 'history.html'),
        technology: resolve(root, 'technology.html'),
        sustainability: resolve(root, 'sustainability.html'),
        recruit: resolve(root, 'recruit.html'),
        ir: resolve(root, 'ir.html'),
        enjoy: resolve(root, 'enjoy.html'),
        bbs: resolve(root, 'bbs.html'),
        login: resolve(root, 'login.html'),
        manager: resolve(root, 'manager.html'),
        opinion_box: resolve(root, 'opinion_box.html'),
        syoyou: resolve(root, 'syoyou.html'),
        news: resolve(root, 'news.html'),
        page404: resolve(root, '404.html'),
        // 英語版
        en_home: resolve(root, 'en/index.html'),
        en_about: resolve(root, 'en/about.html'),
        en_business: resolve(root, 'en/business.html'),
        en_history: resolve(root, 'en/history.html'),
        en_technology: resolve(root, 'en/technology.html'),
        en_sustainability: resolve(root, 'en/sustainability.html'),
        en_recruit: resolve(root, 'en/recruit.html'),
        en_ir: resolve(root, 'en/ir.html'),
        en_enjoy: resolve(root, 'en/enjoy.html'),
        en_bbs: resolve(root, 'en/bbs.html'),
        en_manager: resolve(root, 'en/manager.html'),
        en_news: resolve(root, 'en/news.html'),
      },
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
