import { MetadataRoute } from 'next';

const BLOG_POSTS = [
  'block-periodization-powerlifting',
  'rpe-powerlifting-guide',
  'ai-powerlifting-coach-apps',
  'powerlifting-form-check',
  'powerlifting-nutrition-guide',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const blogEntries: MetadataRoute.Sitemap = BLOG_POSTS.map((slug) => ({
    url: `https://liftly.tech/blog/${slug}`,
    lastModified: new Date('2026-06-12'),
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  return [
    {
      url: 'https://liftly.tech',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: 'https://liftly.tech/blog',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    ...blogEntries,
    {
      url: 'https://liftly.tech/login',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: 'https://liftly.tech/coach/login',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];
}
