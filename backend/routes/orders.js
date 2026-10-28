const express = require('express');
const supabase = require('../supabase');
const { requireAuth } = require('../middleware/auth');
const { text } = require('../utils/validation');
const router = express.Router();
router.use(requireAuth);

router.post('/', async (req, res, next) => {
  try {
    const { items, delivery_address, phone } = req.body;
    if (!Array.isArray(items) || items.length < 1 || items.length > 30 || !text(delivery_address, 500) || !text(phone, 30)) {
      return res.status(400).json({ error: 'Provide food items, a delivery address, and a contact phone number.' });
    }
    const quantities = new Map();
    for (const item of items) {
      if (!item || typeof item.food_id !== 'string' || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) return res.status(400).json({ error: 'Each item must have a valid food ID and quantity between 1 and 20.' });
      quantities.set(item.food_id, (quantities.get(item.food_id) || 0) + item.quantity);
    }
    const ids = [...quantities.keys()];
    const { data: foods, error: foodError } = await supabase.from('food_items').select('id,name,price,is_available').in('id', ids);
    if (foodError) throw foodError;
    if (!foods || foods.length !== ids.length || foods.some(f => !f.is_available)) return res.status(400).json({ error: 'One or more selected foods are unavailable. Refresh the menu and try again.' });
    const foodMap = new Map(foods.map(f => [f.id, f]));
    const orderItems = ids.map(id => ({ food_id: id, food_name: foodMap.get(id).name, quantity: quantities.get(id), unit_price: Number(foodMap.get(id).price) }));
    const total = Number(orderItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0).toFixed(2));
    // A database function inserts the order and its lines atomically.
    const { data, error } = await supabase.rpc('create_food_order', {
      p_customer_id: req.user.sub, p_delivery_address: delivery_address.trim(), p_phone: phone.trim(), p_total: total, p_items: orderItems
    });
    if (error) throw error;
    res.status(201).json({ message: 'Your order has been placed.', order: data });
  } catch (err) { next(err); }
});

router.get('/mine', async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('orders').select('id,status,total,delivery_address,phone,created_at,order_items(id,food_name,quantity,unit_price)').eq('customer_id', req.user.sub).order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ orders: data || [] });
  } catch (err) { next(err); }
});
module.exports = router;
