const express = require('express');
const supabase = require('../supabase');
const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    let query = supabase.from('food_items').select('id,name,description,price,image_url,category_id,is_available,categories(name)').eq('is_available', true).order('name');
    if (typeof req.query.search === 'string' && req.query.search.trim()) query = query.ilike('name', `%${req.query.search.trim().replace(/[,%()]/g, '')}%`);
    if (typeof req.query.category === 'string' && req.query.category) query = query.eq('category_id', req.query.category);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ foods: data || [] });
  } catch (err) { next(err); }
});

router.get('/categories', async (_req, res, next) => {
  try {
    const { data, error } = await supabase.from('categories').select('id,name').order('name');
    if (error) throw error;
    res.json({ categories: data || [] });
  } catch (err) { next(err); }
});
module.exports = router;
