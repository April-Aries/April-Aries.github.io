import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export const GET = async (context) => {
  const posts = await getCollection('blog');

  const rssContent = await rss({
    title: "AA's Blog",
    description: '',
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      summary: post.data.summary,
      date: post.data.date,
      link: `post/${post.slug}`,
    })),
  });

  return new Response(rssContent.body);
};