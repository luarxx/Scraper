import * as fs from 'fs';
import * as path from 'path';
import Database from 'better-sqlite3';
import { ROOT } from './env';

const DB_PATH = process.env.SCRAPER_DB_PATH || path.join(ROOT, 'data', 'scraper.db');
fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });
export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS auto_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      termo TEXT NOT NULL,
      site TEXT NOT NULL,
      ordem INTEGER NOT NULL DEFAULT 0,
      ativo INTEGER NOT NULL DEFAULT 1,
      criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', '-3 hours'))
    );

    CREATE TABLE IF NOT EXISTS auto_execucoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      iniciada_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', '-3 hours')),
      finalizada_em TEXT,
      status TEXT NOT NULL DEFAULT 'executando'
    );

    CREATE TABLE IF NOT EXISTS auto_resultados (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      execucao_id INTEGER NOT NULL,
      config_id INTEGER,
      termo TEXT NOT NULL,
      site TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ok',
      total INTEGER DEFAULT 0,
      produtos TEXT,
      erro TEXT,
      FOREIGN KEY (execucao_id) REFERENCES auto_execucoes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL,
      site TEXT NOT NULL,
      price_cents INTEGER,
      parcelamento TEXT,
      captured_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', '-3 hours'))
    );

    CREATE INDEX IF NOT EXISTS idx_price_history_url ON price_history(url, site);

    CREATE TABLE IF NOT EXISTS search_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      origem TEXT NOT NULL,
      site TEXT NOT NULL,
      termo TEXT,
      url TEXT,
      status TEXT NOT NULL,
      total INTEGER NOT NULL DEFAULT 0,
      duracao_ms INTEGER NOT NULL,
      erro TEXT,
      criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', '-3 hours'))
    );

    CREATE INDEX IF NOT EXISTS idx_search_metrics_site ON search_metrics(site);
    CREATE INDEX IF NOT EXISTS idx_search_metrics_criado ON search_metrics(criado_em);

    CREATE TABLE IF NOT EXISTS watch_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      url TEXT NOT NULL,
      site TEXT NOT NULL,
      canal TEXT NOT NULL DEFAULT 'discord',
      preco_alvo_cents INTEGER NOT NULL,
      ultimo_preco_cents INTEGER,
      ultimo_preco_text TEXT,
      ultimo_parcelamento TEXT,
      status TEXT NOT NULL DEFAULT 'ativo',
      ativo INTEGER NOT NULL DEFAULT 1,
      ultimo_check_em TEXT,
      disparado_em TEXT,
      erro TEXT,
      criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', '-3 hours')),
      atualizado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', '-3 hours'))
    );

    CREATE TABLE IF NOT EXISTS watch_checks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alert_id INTEGER NOT NULL,
      checked_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', '-3 hours')),
      status TEXT NOT NULL,
      preco_cents INTEGER,
      preco_text TEXT,
      erro TEXT,
      notified INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (alert_id) REFERENCES watch_alerts(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_watch_alerts_active ON watch_alerts(ativo, status);
    CREATE INDEX IF NOT EXISTS idx_watch_checks_alert ON watch_checks(alert_id, checked_at);

    CREATE TABLE IF NOT EXISTS wishlist_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      site TEXT NOT NULL,
      image TEXT,
      ultimo_preco_cents INTEGER,
      ultimo_preco_text TEXT,
      ultimo_parcelamento TEXT,
      status TEXT NOT NULL DEFAULT 'ativo',
      ativo INTEGER NOT NULL DEFAULT 1,
      ultimo_check_em TEXT,
      ultimo_disparo_em TEXT,
      erro TEXT,
      criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', '-3 hours')),
      atualizado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', '-3 hours'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_wishlist_items_url_site ON wishlist_items(url, site);
    CREATE INDEX IF NOT EXISTS idx_wishlist_items_active ON wishlist_items(ativo, status);

    CREATE TABLE IF NOT EXISTS wishlist_checks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      checked_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', '-3 hours')),
      status TEXT NOT NULL,
      preco_cents INTEGER,
      preco_text TEXT,
      erro TEXT,
      notified INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (item_id) REFERENCES wishlist_items(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_wishlist_checks_item ON wishlist_checks(item_id, checked_at);
  `);
}

initDatabase();
