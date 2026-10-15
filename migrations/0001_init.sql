CREATE TABLE chains (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  store_count INTEGER
);

CREATE TABLE categories (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  product_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  ean TEXT NOT NULL,
  name TEXT NOT NULL,
  category_id INTEGER NOT NULL,
  unit TEXT,
  pack REAL,
  chains INTEGER NOT NULL DEFAULT 0,
  chain_count INTEGER NOT NULL DEFAULT 0,
  best_price REAL,
  best_chain INTEGER,
  best_unit_price REAL,
  prev_best_price REAL,
  best_changed_on TEXT
);

CREATE INDEX products_category ON products (category_id, name);

CREATE VIRTUAL TABLE products_fts USING fts5 (
  name,
  content = 'products',
  content_rowid = 'id',
  columnsize = 0,
  tokenize = 'unicode61 remove_diacritics 2'
);

CREATE TABLE prices (
  product_id INTEGER NOT NULL,
  chain_id INTEGER NOT NULL,
  valid_from TEXT NOT NULL,
  min_price REAL NOT NULL,
  max_price REAL,
  min_unit_price REAL,
  max_unit_price REAL,
  stores INTEGER,
  PRIMARY KEY (product_id, chain_id)
) WITHOUT ROWID;

CREATE TABLE price_history (
  product_id INTEGER NOT NULL,
  chain_id INTEGER NOT NULL,
  valid_from TEXT NOT NULL,
  valid_to TEXT NOT NULL,
  min_price REAL NOT NULL,
  max_price REAL,
  min_unit_price REAL,
  max_unit_price REAL,
  stores INTEGER,
  PRIMARY KEY (product_id, chain_id, valid_from)
) WITHOUT ROWID;

CREATE TABLE price_changes (
  day TEXT NOT NULL,
  product_id INTEGER NOT NULL,
  chain_id INTEGER NOT NULL,
  old_price REAL,
  new_price REAL,
  PRIMARY KEY (day, product_id, chain_id)
) WITHOUT ROWID;

CREATE TABLE imports (
  day TEXT PRIMARY KEY,
  imported_at TEXT NOT NULL,
  source_etag TEXT,
  row_count INTEGER NOT NULL,
  products_new INTEGER NOT NULL,
  prices_changed INTEGER NOT NULL,
  prices_new INTEGER NOT NULL,
  prices_gone INTEGER NOT NULL
);
