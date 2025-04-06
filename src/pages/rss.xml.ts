import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';

export const GET = async (context: APIContext) => {
  const posts = await getCollection('blog');

  const rssContent = await rss({
    title: "AA's Blog",
    description: '',
    site: context.site ?? new URL('https://april-aries-github-io.vercel.app'),
    items: posts.map((post) => ({
      title: post.data.title,
      summary: post.data.summary,
      date: post.data.date,
      link: `blog/${post.slug}`,
    })),
  });

  return new Response(rssContent.body);
};