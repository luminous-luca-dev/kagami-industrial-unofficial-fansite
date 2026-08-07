import js from '@eslint/js';

export default [
	// ESLintの推奨ルールをベースにする
	js.configs.recommended,
	{
		languageOptions: {
			// ブラウザ環境（Vanilla JS）で使うグローバル変数を許可する
			globals: {
				window: 'readonly',
				document: 'readonly',
				console: 'readonly',
				alert: 'readonly',
			},
		},
		rules: {
			// 未使用の変数があれば警告を出す（エラーにしてCIを止めない程度にする）
			'no-unused-vars': 'warn',
			// 定義されていない変数を使ったらエラー
			'no-undef': 'error',
		},
	},
];
