CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS "sumi_posts_search_trgm"
  ON "sumi_posts" USING gin (
    "title" gin_trgm_ops,
    "excerpt" gin_trgm_ops,
    "body" gin_trgm_ops
  );