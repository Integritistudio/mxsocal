const Story = require('../models/story.model');
const { Op } = require('sequelize');
const { cleanDocument, plainText, safeLink } = require('../lib/story-content');
const publicWhere = () => ({ status: 'published', publishedAt: { [Op.lte]: new Date() } });
const summaryFields = ['id', 'title', 'slug', 'excerpt', 'category', 'author', 'coverImage', 'coverAlt', 'featured', 'publishedAt', 'updatedAt'];
const dto = story => { const data = story.toJSON(); data.readingMinutes = Math.max(1, Math.ceil(plainText(data.content).split(/\s+/).filter(Boolean).length / 200)); return data; };
function fields(body, previous) {
  const data = {};
  for (const [key, max] of Object.entries({ title: 160, slug: 180, excerpt: 400, category: 60, author: 100, coverImage: 500, coverAlt: 200, seoTitle: 70, seoDescription: 170 })) {
    if (body[key] === undefined) continue;
    if (typeof body[key] !== 'string' || body[key].length > max) throw new Error(`${key} must be ${max} characters or fewer.`);
    data[key] = body[key].trim();
  }
  if (!previous && (!data.title || !data.slug)) throw new Error('Title and URL slug are required.');
  for (const key of ['title', 'slug', 'category', 'author']) if (data[key] === '') throw new Error(`${key} is required.`);
  if (['admin', 'sitemap', 'media'].includes(data.slug)) throw new Error('This URL slug is reserved. Choose another.');
  if (data.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug)) throw new Error('Use lowercase words separated by hyphens for the URL slug.');
  if (data.coverImage && !safeLink(data.coverImage)) throw new Error('Enter a valid cover image URL.');
  if (body.content !== undefined) data.content = cleanDocument(body.content);
  if (body.featured !== undefined) { if (typeof body.featured !== 'boolean') throw new Error('Choose a valid featured setting.'); data.featured = body.featured; }
  if (body.status !== undefined) { if (!['draft', 'published'].includes(body.status)) throw new Error('Choose Draft or Published.'); data.status = body.status; }
  if (data.status === 'published' || (data.status === undefined && previous?.status === 'published')) {
    const combined = { ...(previous?.toJSON() || {}), ...data };
    if (!combined.excerpt || !combined.coverImage || !combined.coverAlt || !plainText(combined.content).trim()) throw new Error('Add an excerpt, cover image, image description, and article content before publishing.');
    data.publishedAt = previous?.publishedAt || new Date();
  }
  return data;
}
const fail = (res, error) => res.status(error.name === 'SequelizeUniqueConstraintError' ? 409 : 400).json({ message: error.name === 'SequelizeUniqueConstraintError' ? 'That URL slug is already in use. Choose another.' : error.message });
exports.list = async (req, res) => {
  const { q = '', category = '', page = '1' } = req.query;
  if ([q, category, page].some(value => typeof value !== 'string') || q.length > 100 || category.length > 60 || !/^[1-9]\d{0,3}$/.test(page)) return res.status(400).json({ message: 'Check your story filters.' });
  try {
    const where = publicWhere(); if (category) where.category = category;
    if (q.trim()) where[Op.or] = ['title', 'excerpt'].map(key => ({ [key]: { [Op.iLike]: `%${q.trim().replace(/[%_\\]/g, '\\$&')}%` } }));
    const limit = 6, offset = (Number(page) - 1) * limit;
    const [result, groups, featured] = await Promise.all([
      Story.findAndCountAll({ where, attributes: [...summaryFields, 'content'], order: [['publishedAt', 'DESC'], ['id', 'ASC']], limit, offset }),
      Story.findAll({ where: publicWhere(), attributes: ['category'], group: ['category'], order: [['category', 'ASC']] }),
      !q && !category && page === '1' ? Story.findOne({ where: { ...publicWhere(), featured: true }, order: [['publishedAt', 'DESC']] }) : null,
    ]);
    const summarize = story => { const data = dto(story); delete data.content; delete data.seoTitle; delete data.seoDescription; delete data.status; return data; };
    res.json({ stories: result.rows.map(summarize), featured: featured ? summarize(featured) : null, total: result.count, page: Number(page), hasMore: offset + result.rows.length < result.count, categories: groups.map(row => row.category) });
  } catch { res.status(503).json({ message: 'Stories are temporarily unavailable. Please try again.' }); }
};
exports.detail = async (req, res) => {
  if (!/^[a-z0-9-]{1,180}$/.test(req.params.slug)) return res.sendStatus(404);
  try {
    const story = await Story.findOne({ where: { ...publicWhere(), slug: req.params.slug } });
    if (!story) return res.status(404).json({ message: 'Story not found.' });
    const related = await Story.findAll({ where: { ...publicWhere(), id: { [Op.ne]: story.id } }, attributes: summaryFields, order: [['publishedAt', 'DESC']], limit: 3 });
    res.json({ story: dto(story), related });
  } catch { res.status(503).json({ message: 'Unable to load this story.' }); }
};
exports.sitemap = async (_req, res) => { try { res.json(await Story.findAll({ where: publicWhere(), attributes: ['slug', 'updatedAt'], order: [['slug', 'ASC']] })); } catch { res.sendStatus(503); } };
exports.adminList = async (_req, res) => { try { res.json(await Story.findAll({ attributes: { exclude: ['content'] }, order: [['updatedAt', 'DESC']] })); } catch { res.status(503).json({ message: 'Unable to load stories.' }); } };
exports.adminDetail = async (req, res) => { try { const story = await Story.findByPk(req.params.id); if (!story) return res.sendStatus(404); res.json(story); } catch { res.status(400).json({ message: 'Invalid story.' }); } };
exports.create = async (req, res) => { try { res.status(201).json(await Story.create(fields(req.body || {}))); } catch (error) { fail(res, error); } };
exports.update = async (req, res) => { try { const story = await Story.findByPk(req.params.id); if (!story) return res.sendStatus(404); await story.update(fields(req.body || {}, story)); res.json(story); } catch (error) { fail(res, error); } };
exports.remove = async (req, res) => { try { const story = await Story.findByPk(req.params.id); if (!story) return res.sendStatus(404); await story.destroy(); res.json({ message: 'Story deleted.' }); } catch { res.status(400).json({ message: 'Unable to delete this story.' }); } };
