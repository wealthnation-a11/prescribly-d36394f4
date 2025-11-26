-- Add source tracking to blog_posts
ALTER TABLE blog_posts 
ADD COLUMN IF NOT EXISTS source_type TEXT,
ADD COLUMN IF NOT EXISTS source_id UUID;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_blog_posts_source ON blog_posts(source_type, source_id);

-- Add comment for documentation
COMMENT ON COLUMN blog_posts.source_type IS 'Type of source: herbal_article, manual, etc.';
COMMENT ON COLUMN blog_posts.source_id IS 'ID of the source record (e.g., herbal_article id)';
