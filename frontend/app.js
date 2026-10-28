const API = '/api';
const $ = (selector) => document.querySelector(selector);
const state = { foods: [], categories: [], cart: new Map(), token: localStorage.getItem('crave_token') || '', user: null, authMode: 'login' };
const foodEmoji = (name) => { const n = name.toLowerCase(); if (n.includes('burger')) return '🍔'; if (n.includes('pizza')) return '🍕'; if (n.includes('paneer') || n.includes('masala') || n.includes('dosa')) return '🍛'; if (n.includes('fries')) return '🍟'; if (n.includes('lime') || n.includes('drink') || n.includes('juice')) return '🥤'; if (n.includes('cake') || n.includes('dessert')) return '🍰'; if (n.includes('salad')) return '🥗'; return '🍽️'; };
const money = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(n || 0));
async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(`${API}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) { if (response.status === 401 && state.token) setUser(null); throw new Error(data.error || 'Request failed. Please try again.'); }
  return data;
}
function toast(message) { const el = $('#toast'); el.textContent = message; el.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('show'), 2600); }
function showModal(id) { $(`#${id}`).hidden = false; document.body.style.overflow = 'hidden'; }
function hideModal(id) { $(`#${id}`).hidden = true; document.body.style.overflow = ''; }
function setMessage(el, message, isError = false) { el.textContent = message; el.classList.toggle('error', isError); }
function setUser(user, token = state.token) {
  state.user = user; state.token = token || ''; if (state.token) localStorage.setItem('crave_token', state.token); else localStorage.removeItem('crave_token');
  $('#login-open').hidden = !!user; $('#register-open').hidden = !!user; $('#logout-button').hidden = !user; $('#orders-nav').hidden = !user; $('#admin-nav').hidden = user?.role !== 'admin'; $('#orders').hidden = !user; $('#admin-panel').hidden = user?.role !== 'admin';
  if (!user) { $('#my-orders').innerHTML = ''; $('#admin-orders').innerHTML = ''; }
}
async function loadCategories() {
  try { const { categories } = await api('/foods/categories'); state.categories = categories; $('#category-filter').innerHTML = '<option value="">All categories</option>' + categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join(''); $('#admin-category').innerHTML = '<option value="">No category</option>' + categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join(''); }
  catch (err) { setMessage($('#menu-message'), err.message, true); }
}
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch])); }
async function loadFoods() {
  const grid = $('#food-grid'); grid.innerHTML = '<div class="empty-state">Finding the good stuff…</div>';
  const params = new URLSearchParams(); if ($('#food-search').value.trim()) params.set('search', $('#food-search').value.trim()); if ($('#category-filter').value) params.set('category', $('#category-filter').value);
  try { const { foods } = await api(`/foods?${params}`); state.foods = foods; renderFoods(); setMessage($('#menu-message'), `${foods.length} delicious option${foods.length === 1 ? '' : 's'} to choose from.`); }
  catch (err) { grid.innerHTML = `<div class="empty-state">${escapeHtml(err.message)}<br>Make sure the backend and Supabase database are configured.</div>`; }
}
function renderFoods() {
  const grid = $('#food-grid');
  if (!state.foods.length) { grid.innerHTML = '<div class="empty-state">No dishes found. Try another search or category.</div>'; return; }
  grid.innerHTML = state.foods.map(food => `<article class="food-card"><div class="food-visual"><span class="category-pill">${escapeHtml(food.categories?.name || 'Favourite')}</span><span class="food-symbol" aria-hidden="true">${foodEmoji(food.name)}</span></div><div class="food-info"><div class="food-title-row"><h3>${escapeHtml(food.name)}</h3><span class="food-price">${money(food.price)}</span></div><p>${escapeHtml(food.description || 'A tasty choice, made for your cravings.')}</p><button class="add-button" data-add="${food.id}">＋ Add to cart</button></div></article>`).join('');
}
function addToCart(id) { const food = state.foods.find(f => f.id === id); if (!food) return; const existing = state.cart.get(id); state.cart.set(id, { food, quantity: Math.min(20, (existing?.quantity || 0) + 1) }); renderCart(); toast(`${food.name} added to your cart`); }
function cartTotal() { return [...state.cart.values()].reduce((sum, line) => sum + Number(line.food.price) * line.quantity, 0); }
function renderCart() {
  const count = [...state.cart.values()].reduce((sum, line) => sum + line.quantity, 0); $('#cart-count').textContent = count; const container = $('#cart-items');
  if (!state.cart.size) container.innerHTML = '<div class="empty-state">Your cart is empty.<br>Explore the menu and add a favourite!</div>';
  else container.innerHTML = [...state.cart.entries()].map(([id, line]) => `<div class="cart-line"><div><strong>${escapeHtml(line.food.name)}</strong><small>${money(line.food.price)} each</small></div><div class="quantity-controls"><button type="button" data-qty="${id}" data-delta="-1" aria-label="Decrease quantity">−</button><span>${line.quantity}</span><button type="button" data-qty="${id}" data-delta="1" aria-label="Increase quantity">＋</button></div></div>`).join('');
  $('#cart-total').textContent = money(cartTotal()); $('#checkout-form').hidden = !state.cart.size;
}
function setAuthMode(mode) {
  state.authMode = mode; const isRegister = mode === 'register'; $('#auth-title').textContent = isRegister ? 'Create your account' : 'Log in to continue'; $('#auth-subtitle').textContent = isRegister ? 'Join us for something delicious.' : 'Your favourite food is waiting.'; $('#name-field').hidden = !isRegister; $('#name-field input').required = isRegister; $('#auth-form [name=password]').autocomplete = isRegister ? 'new-password' : 'current-password'; $('#auth-submit').textContent = isRegister ? 'Create account' : 'Log in'; $('#switch-copy').textContent = isRegister ? 'Already have an account?' : 'New here?'; $('#switch-auth').textContent = isRegister ? 'Log in' : 'Create an account'; setMessage($('#auth-message'), ''); }
async function submitAuth(event) {
  event.preventDefault(); const form = new FormData(event.currentTarget); const body = Object.fromEntries(form.entries()); const button = $('#auth-submit'); button.disabled = true; setMessage($('#auth-message'), 'Please wait…');
  try {
    if (state.authMode === 'register') { await api('/auth/register', { method: 'POST', body: JSON.stringify(body) }); setAuthMode('login'); $('#auth-form [name=email]').value = body.email; setMessage($('#auth-message'), 'Account created. Please log in.'); }
    else { const result = await api('/auth/login', { method: 'POST', body: JSON.stringify(body) }); setUser(result.user, result.token); hideModal('auth-modal'); event.currentTarget.reset(); toast(`Welcome, ${result.user.name}!`); await loadMyOrders(); if (result.user.role === 'admin') await loadAdminOrders(); }
  } catch (err) { setMessage($('#auth-message'), err.message, true); } finally { button.disabled = false; }
}
async function loadMyOrders() {
  if (!state.user) return;
  try { const { orders } = await api('/orders/mine'); $('#my-orders').innerHTML = orders.length ? orders.map(order => `<article class="order-card"><div class="order-top"><div><h3>Order #${escapeHtml(order.id.slice(0, 8).toUpperCase())}</h3><div class="muted">${new Date(order.created_at).toLocaleString()} · ${escapeHtml(order.delivery_address)}</div></div><span class="status">${escapeHtml(order.status)}</span></div><div class="order-items">${order.order_items.map(i => `${escapeHtml(i.food_name)} × ${i.quantity} — ${money(i.unit_price * i.quantity)}`).join('<br>')}</div><div class="order-total">Total: ${money(order.total)}</div></article>`).join('') : '<div class="empty-state">No orders yet. Your first delicious order is waiting!</div>'; }
  catch (err) { $('#my-orders').innerHTML = `<div class="empty-state">${escapeHtml(err.message)}</div>`; }
}
async function submitCheckout(event) {
  event.preventDefault(); if (!state.user) { hideModal('cart-modal'); setAuthMode('login'); showModal('auth-modal'); setMessage($('#auth-message'), 'Please log in before placing an order.'); return; }
  const button = event.currentTarget.querySelector('button[type=submit]'); button.disabled = true; setMessage($('#checkout-message'), 'Placing your order…'); const form = new FormData(event.currentTarget);
  try { const result = await api('/orders', { method: 'POST', body: JSON.stringify({ delivery_address: form.get('delivery_address'), phone: form.get('phone'), items: [...state.cart.values()].map(line => ({ food_id: line.food.id, quantity: line.quantity })) }) }); state.cart.clear(); renderCart(); event.currentTarget.reset(); hideModal('cart-modal'); toast(`Order placed! Total ${money(result.order.total)}`); await loadMyOrders(); $('#orders').scrollIntoView({ behavior: 'smooth' }); }
  catch (err) { setMessage($('#checkout-message'), err.message, true); } finally { button.disabled = false; }
}
async function loadAdminOrders() {
  if (state.user?.role !== 'admin') return;
  try { const { orders } = await api('/admin/orders'); const el = $('#admin-orders'); el.innerHTML = orders.length ? orders.map(order => `<article class="order-card"><div class="order-top"><div><h3>Order #${escapeHtml(order.id.slice(0,8).toUpperCase())}</h3><div class="muted">${escapeHtml(order.profiles?.name || 'Customer')} · ${escapeHtml(order.profiles?.email || '')}<br>${escapeHtml(order.delivery_address)} · ${escapeHtml(order.phone)}</div></div><strong>${money(order.total)}</strong></div><div class="order-items">${order.order_items.map(i => `${escapeHtml(i.food_name)} × ${i.quantity}`).join('<br>')}</div><div class="admin-status"><label>Status <select data-status-order="${order.id}">${['Pending','Confirmed','Preparing','Out for Delivery','Delivered','Cancelled'].map(s => `<option ${s===order.status?'selected':''}>${s}</option>`).join('')}</select></label></div></article>`).join('') : '<div class="empty-state">No orders have been placed yet.</div>'; }
  catch (err) { $('#admin-orders').innerHTML = `<div class="empty-state">${escapeHtml(err.message)}<br>Log in with an administrator account to manage orders.</div>`; }
}
async function submitFood(event) {
  event.preventDefault(); const form = new FormData(event.currentTarget); const body = Object.fromEntries(form.entries()); body.price = Number(body.price); body.category_id = body.category_id || null;
  try { await api('/admin/foods', { method: 'POST', body: JSON.stringify(body) }); event.currentTarget.reset(); setMessage($('#food-form-message'), 'Food item added successfully.'); await loadFoods(); toast('Food item added'); }
  catch (err) { setMessage($('#food-form-message'), err.message, true); }
}
function wireEvents() {
  $('#food-grid').addEventListener('click', e => { const button = e.target.closest('[data-add]'); if (button) addToCart(button.dataset.add); });
  $('#cart-items').addEventListener('click', e => { const button = e.target.closest('[data-qty]'); if (!button) return; const id = button.dataset.qty; const line = state.cart.get(id); if (!line) return; line.quantity += Number(button.dataset.delta); if (line.quantity <= 0) state.cart.delete(id); else if (line.quantity > 20) line.quantity = 20; renderCart(); });
  $('#food-search').addEventListener('input', debounce(loadFoods, 250)); $('#category-filter').addEventListener('change', loadFoods);
  $('#login-open').addEventListener('click', () => { setAuthMode('login'); showModal('auth-modal'); }); $('#register-open').addEventListener('click', () => { setAuthMode('register'); showModal('auth-modal'); }); $('#switch-auth').addEventListener('click', () => setAuthMode(state.authMode === 'login' ? 'register' : 'login'));
  $('#auth-form').addEventListener('submit', submitAuth); $('#cart-open').addEventListener('click', () => { renderCart(); showModal('cart-modal'); }); $('#checkout-form').addEventListener('submit', submitCheckout); $('#food-form').addEventListener('submit', submitFood);
  $('#logout-button').addEventListener('click', () => { setUser(null, ''); toast('You have logged out.'); }); $('#admin-nav').addEventListener('click', () => { $('#admin-panel').scrollIntoView({ behavior: 'smooth' }); loadAdminOrders(); });
  $('#admin-orders').addEventListener('change', async e => { const select = e.target.closest('[data-status-order]'); if (!select) return; try { await api(`/admin/orders/${select.dataset.statusOrder}/status`, { method: 'PATCH', body: JSON.stringify({ status: select.value }) }); toast('Order status updated'); await loadAdminOrders(); } catch (err) { toast(err.message); loadAdminOrders(); } });
  document.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', () => hideModal(el.dataset.close === 'auth' ? 'auth-modal' : 'cart-modal')));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { hideModal('auth-modal'); hideModal('cart-modal'); } });
}
function debounce(fn, wait) { let timer; return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), wait); }; }
async function init() {
  $('#year').textContent = new Date().getFullYear(); wireEvents(); renderCart();
  if (state.token) { try { const { user } = await api('/auth/me'); setUser(user); } catch (_) { setUser(null, ''); } }
  await loadCategories(); await loadFoods(); if (state.user) { await loadMyOrders(); if (state.user.role === 'admin') await loadAdminOrders(); }
}
init();
