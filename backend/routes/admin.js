const express = require('express');
const supabase = require('../supabase');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { text, positiveNumber } = require('../utils/validation');
const router = express.Router();
router.use(requireAuth, requireAdmin);

router.get('/orders', async (_req, res, next) => {
  try {
    const { data, error } = await supabase.from('orders').select('id,status,total,delivery_address,phone,created_at,profiles(name,email),order_items(food_name,quantity,unit_price)').order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ orders: data || [] });
  } catch (err) { next(err); }
});

router.patch('/orders/:id/status', async (req, res, next) => {
  try {
    const allowed = ['Pending', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'];
    if (!allowed.includes(req.body.status)) return res.status(400).json({ error: 'Choose a valid order status.' });
    const { data, error } = await supabase.from('orders').update({ status: req.body.status }).eq('id', req.params.id).select('id,status').single();
    if (error?.code === 'PGRST116') return res.status(404).json({ error: 'Order not found.' });
    if (error) throw error;
    res.json({ order: data });
  } catch (err) { next(err); }
});

router.post('/foods', async (req, res, next) => {
  try {
    const { name, description = '', price, category_id = null, image_url = '' } = req.body;
    if (!text(name, 120) || !positiveNumber(price) || Number(price) > 100000 || (description && typeof description !== 'string') || (image_url && typeof image_url !== 'string')) return res.status(400).json({ error: 'Enter a food name and a valid positive price.' });
    const { data, error } = await supabase.from('food_items').insert({ name: name.trim(), description: String(description).trim(), price: Number(price), category_id: category_id || null, image_url: String(image_url).trim() || null, is_available: true }).select().single();
    if (error) throw error;
    res.status(201).json({ food: data });
  } catch (err) { next(err); }
});

router.patch('/foods/:id', async (req, res, next) => {
  try {
    const updates = {};
    if (req.body.name !== undefined) { if (!text(req.body.name, 120)) return res.status(400).json({ error: 'Food name is required.' }); updates.name = req.body.name.trim(); }
    if (req.body.description !== undefined) { if (typeof req.body.description !== 'string') return res.status(400).json({ error: 'Description must be text.' }); updates.description = req.body.description.trim(); }
    if (req.body.price !== undefined) { if (!positiveNumber(req.body.price) || Number(req.body.price) > 100000) return res.status(400).json({ error: 'Price must be a positive number.' }); updates.price = Number(req.body.price); }
    if (req.body.category_id !== undefined) updates.category_id = req.body.category_id || null;
    if (req.body.image_url !== undefined) updates.image_url = req.body.image_url || null;
    if (req.body.is_available !== undefined) { if (typeof req.body.is_available !== 'boolean') return res.status(400).json({ error: 'Availability must be true or false.' }); updates.is_available = req.body.is_available; }
    if (!Object.keys(updates).length) return res.status(400).json({ error: 'No editable fields were provided.' });
    const { data, error } = await supabase.from('food_items').update(updates).eq('id', req.params.id).select().single();
    if (error?.code === 'PGRST116') return res.status(404).json({ error: 'Food item not found.' });
    if (error) throw error;
    res.json({ food: data });
  } catch (err) { next(err); }
});

router.delete('/foods/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('food_items').delete().eq('id', req.params.id).select('id').single();
    if (error?.code === 'PGRST116') return res.status(404).json({ error: 'Food item not found.' });
    if (error) throw error;
    res.json({ message: 'Food item deleted.', id: data.id });
  } catch (err) { next(err); }
});
module.exports = router;
