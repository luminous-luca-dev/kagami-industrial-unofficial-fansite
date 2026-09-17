// ============================================
// KAGAMI INDUSTRIAL - Supabase クライアント（共通）
// ============================================
//
// 【公開リポジトリ向け注記】
//   ここで使用しているキーは Supabase の "publishable anon key" です。
//   このキーはブラウザ（DevTools）から常に可視であり、
//   クライアントサイド公開を前提とした設計になっています。
//   セキュリティは Supabase ダッシュボードの RLS（Row Level Security）
//   によって担保されています。
//
// 【キーのローテーション手順】
//   Supabase ダッシュボード → Project Settings → API → Regenerate anon key
//   その後、下記 SUPABASE_ANON_KEY の値を新しいキーに差し替えてください。
// ============================================

const SUPABASE_URL = 'https://vcsnquepttevlmhgyeje.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_S6iay_evMqvHMLsgThkWOQ_pX3ghA4R';

if (!window._supabase) {
  window._supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
