import js from '@eslint/js';
import globals from 'globals';

export default [
  // ESLintの推奨ルールをベースにする
  js.configs.recommended,
  {
    languageOptions: {
      // ブラウザ環境（Vanilla JS）で使うグローバル変数を一括で許可する
      globals: {
        ...globals.browser, // これで window, document, localStorage, fetch 等が全て許可されます
        
        // CDNや別ファイルから読み込んでいる独自のグローバル変数
        supabase: 'readonly',
        _supabase: 'readonly',
        escapeHTML: 'readonly',
      },
    },
    rules: {
      // 未使用の変数があれば警告を出す
      // （ただし、HTMLのonclick等から呼び出される特定の関数や、_で始まる変数は無視する）
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^(setReplyTarget|toggleLike|toggleMosaic|logoutBBS)$'
        }
      ],
      // 定義されていない変数を使ったらエラー
      'no-undef': 'error',
    },
  },
];