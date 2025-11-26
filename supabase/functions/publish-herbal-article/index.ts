import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authenticated user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { article_id } = await req.json();

    if (!article_id) {
      return new Response(
        JSON.stringify({ error: 'Article ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the herbal article
    const { data: article, error: articleError } = await supabase
      .from('herbal_articles')
      .select('*, herbal_practitioners!inner(user_id, first_name, last_name)')
      .eq('id', article_id)
      .single();

    if (articleError || !article) {
      console.error('Error fetching article:', articleError);
      return new Response(
        JSON.stringify({ error: 'Article not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if blog post already exists for this article
    const { data: existingPost } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('source_type', 'herbal_article')
      .eq('source_id', article_id)
      .single();

    if (existingPost) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Blog post already exists',
          blog_post_id: existingPost.id 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate slug from title
    const slug = article.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      + '-' + Date.now();

    // Create excerpt (first 160 characters of content)
    const excerpt = article.content.substring(0, 160) + '...';

    // Create blog post
    const { data: blogPost, error: blogError } = await supabase
      .from('blog_posts')
      .insert({
        author_id: article.herbal_practitioners.user_id,
        title: article.title,
        content: article.content,
        excerpt: excerpt,
        category: article.category || 'Herbal Medicine',
        slug: slug,
        cover_image: article.cover_image,
        published: true,
        published_at: new Date().toISOString(),
        source_type: 'herbal_article',
        source_id: article_id,
        meta_description: excerpt,
        tags: ['herbal medicine', 'natural remedies'],
      })
      .select()
      .single();

    if (blogError) {
      console.error('Error creating blog post:', blogError);
      return new Response(
        JSON.stringify({ error: 'Failed to create blog post', details: blogError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Blog post created successfully:', blogPost.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        blog_post_id: blogPost.id,
        slug: blogPost.slug 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in publish-herbal-article function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
