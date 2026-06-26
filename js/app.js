/**
 * E-Commerce Store - Main Application
 * =====================================
 * STEP 10: Frontend JavaScript
 *
 * Architecture:
 *   - API: All communication with Django backend
 *   - Auth: Login/register/logout + JWT token management
 *   - Cart: In-memory shopping cart (localStorage for persistence)
 *   - Pages: Single-page app - show/hide sections
 *   - Render: Functions that build HTML from data
 */

// ─── CONFIGURATION ────────────────────────────────────────────────────────────
const API_BASE = 'http://localhost:8000/api/v1';

// ─── STATE ────────────────────────────────────────────────────────────────────
let state = {
  user: null,        // Current logged-in user object
  token: null,       // JWT access token
  cart: [],          // Array of { product, quantity }
  products: [],      // All fetched products
  categories: [],    // All categories
  currentPage: 'home',
};

// ─── LOCAL STORAGE HELPERS ────────────────────────────────────────────────────
// Persist auth and cart between page refreshes

function saveAuth(user, token) {
  state.user = user;
  state.token = token;
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

function loadAuth() {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  if (token && user) {
    state.token = token;
    state.user = JSON.parse(user);
  }
}

function clearAuth() {
  state.user = null;
  state.token = null;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

function saveCart() {
  localStorage.setItem('cart', JSON.stringify(state.cart));
}

function loadCart() {
  const saved = localStorage.getItem('cart');
  if (saved) state.cart = JSON.parse(saved);
}

// ─── API HELPER ───────────────────────────────────────────────────────────────
/**
 * Make an API request to the Django backend.
 * Automatically adds JWT Authorization header if user is logged in.
 *
 * @param {string} endpoint - e.g. '/products/'
 * @param {string} method   - 'GET', 'POST', 'PUT', 'DELETE'
 * @param {object} body     - Request body (for POST/PUT)
 * @returns {object}        - { data, error, status }
 */
async function apiRequest(endpoint, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await response.json();
    return { data, status: response.status, ok: response.ok };
  } catch (err) {
    console.error('API Error:', err);
    return { data: { error: 'Network error. Is the Django server running?' }, status: 0, ok: false };
  }
}

// ─── TOAST NOTIFICATIONS ──────────────────────────────────────────────────────
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> ${message}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ─── PAGE NAVIGATION ──────────────────────────────────────────────────────────
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(`page-${pageId}`);
  if (target) {
    target.classList.add('active');
    state.currentPage = pageId;
    window.scrollTo(0, 0);
  }
  updateNavbar();
}

// ─── NAVBAR UPDATE ────────────────────────────────────────────────────────────
function updateNavbar() {
  const guestLinks = document.getElementById('guest-links');
  const userLinks = document.getElementById('user-links');
  const adminLinks = document.getElementById('admin-links');
  const cartCount = document.getElementById('cart-count');

  if (state.user) {
    guestLinks.style.display = 'none';
    userLinks.style.display = 'flex';
    document.getElementById('nav-username').textContent = state.user.username;
    adminLinks.style.display = state.user.role === 'admin' ? 'flex' : 'none';
  } else {
    guestLinks.style.display = 'flex';
    userLinks.style.display = 'none';
    adminLinks.style.display = 'none';
  }

  const total = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  cartCount.textContent = total;
  cartCount.style.display = total > 0 ? 'flex' : 'none';
}

// ─── CATEGORY EMOJI HELPER ────────────────────────────────────────────────────
function getCategoryEmoji(categoryName) {
  const map = {
    'Electronics': '📱', 'Clothing': '👕', 'Books': '📚',
    'Home & Kitchen': '🏠', 'Sports': '⚽', 'default': '📦'
  };
  return map[categoryName] || map['default'];
}

// ─── PRODUCT CATALOG ──────────────────────────────────────────────────────────
async function loadProducts(filters = {}) {
  const grid = document.getElementById('product-grid');
  grid.innerHTML = '<div class="loading-container">⏳ Loading products...</div>';

  let url = '/products/?';
  if (filters.search) url += `search=${filters.search}&`;
  if (filters.category) url += `category=${filters.category}&`;
  if (filters.min_price) url += `min_price=${filters.min_price}&`;
  if (filters.max_price) url += `max_price=${filters.max_price}&`;
  if (filters.in_stock) url += `in_stock=true&`;

  const { data, ok } = await apiRequest(url);
  if (!ok) {
    grid.innerHTML = `<div class="alert alert-danger">❌ ${data.error || 'Failed to load products'}</div>`;
    return;
  }

  state.products = data.products || [];
  renderProductGrid(state.products);
}

function renderProductGrid(products) {
  const grid = document.getElementById('product-grid');
  const count = document.getElementById('product-count');
  count.textContent = `${products.length} products found`;

  if (products.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1">
        <div class="icon">🔍</div>
        <h3>No products found</h3>
        <p>Try adjusting your filters</p>
      </div>`;
    return;
  }

  grid.innerHTML = products.map(p => `
    <div class="product-card" onclick="showProductDetail(${p.id})">
      <div class="product-emoji">${getCategoryEmoji(p.category_name)}</div>
      <div class="product-body">
        <div class="product-category">${p.category_name || 'Uncategorized'}</div>
        <div class="product-name">${p.name}</div>
        <div class="product-price">₹${parseFloat(p.price).toLocaleString('en-IN')}</div>
      </div>
      <div class="product-footer">
        <span class="stock-badge ${p.is_in_stock ? 'in-stock' : 'out-stock'}">
          ${p.is_in_stock ? `✓ ${p.stock} in stock` : '✗ Out of stock'}
        </span>
        ${p.is_in_stock ? `
          <button class="btn btn-amber btn-sm" onclick="event.stopPropagation(); addToCart(${p.id})">
            🛒 Add
          </button>` : ''}
      </div>
    </div>
  `).join('');
}

async function loadCategories() {
  const { data, ok } = await apiRequest('/products/categories/');
  if (ok) {
    state.categories = data;
    const select = document.getElementById('filter-category');
    select.innerHTML = '<option value="">All Categories</option>' +
      data.map(c => `<option value="${c.id}">${c.name} (${c.product_count})</option>`).join('');
  }
}

function applyFilters() {
  const search = document.getElementById('filter-search').value;
  const category = document.getElementById('filter-category').value;
  const min_price = document.getElementById('filter-min-price').value;
  const max_price = document.getElementById('filter-max-price').value;
  const in_stock = document.getElementById('filter-instock').checked;
  loadProducts({ search, category, min_price, max_price, in_stock });
}

// ─── PRODUCT DETAIL MODAL ─────────────────────────────────────────────────────
async function showProductDetail(productId) {
  const { data, ok } = await apiRequest(`/products/${productId}/`);
  if (!ok) { showToast('Failed to load product', 'error'); return; }

  document.getElementById('modal-product').innerHTML = `
    <div class="product-emoji" style="height:180px; border-radius:10px; margin-bottom:20px; font-size:80px; display:flex; align-items:center; justify-content:center; background:linear-gradient(135deg,#e8f4fd,#dbeafe);">
      ${getCategoryEmoji(data.category_name)}
    </div>
    <div class="product-category">${data.category_name || 'Uncategorized'}</div>
    <h2 style="font-size:20px; font-weight:800; margin:8px 0; color:var(--navy)">${data.name}</h2>
    <p style="color:var(--text-secondary); font-size:14px; margin-bottom:16px; line-height:1.6">${data.description || 'No description available.'}</p>
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:20px">
      <div class="product-price" style="font-size:28px">₹${parseFloat(data.price).toLocaleString('en-IN')}</div>
      <span class="stock-badge ${data.is_in_stock ? 'in-stock' : 'out-stock'}">
        ${data.is_in_stock ? `✓ ${data.stock} in stock` : '✗ Out of stock'}
      </span>
    </div>
    ${data.is_in_stock ? `
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px">
        <label style="font-size:14px; font-weight:600">Quantity:</label>
        <div class="qty-control">
          <button class="qty-btn" onclick="this.nextElementSibling.value=Math.max(1,+this.nextElementSibling.value-1)">−</button>
          <input type="number" id="modal-qty" value="1" min="1" max="${data.stock}" style="width:50px; text-align:center; border:1.5px solid var(--border); border-radius:6px; padding:4px; font-size:15px; font-weight:700;">
          <button class="qty-btn" onclick="this.previousElementSibling.value=Math.min(${data.stock},+this.previousElementSibling.value+1)">+</button>
        </div>
      </div>
      <button class="btn btn-amber btn-lg btn-block" onclick="addToCartWithQty(${data.id}, '${data.name}', ${data.price}, ${data.stock})">
        🛒 Add to Cart
      </button>` : `
      <div class="alert alert-danger">😔 This product is currently out of stock.</div>`}
  `;
  document.getElementById('modal-product-overlay').classList.add('open');
}

// ─── CART MANAGEMENT ──────────────────────────────────────────────────────────
function addToCart(productId) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;
  if (!product.is_in_stock) { showToast('Product is out of stock', 'error'); return; }

  const existing = state.cart.find(item => item.product.id === productId);
  if (existing) {
    if (existing.quantity >= product.stock) {
      showToast(`Max ${product.stock} units available`, 'error');
      return;
    }
    existing.quantity++;
  } else {
    state.cart.push({ product, quantity: 1 });
  }

  saveCart();
  updateNavbar();
  showToast(`✅ ${product.name} added to cart!`, 'success');
}

function addToCartWithQty(productId, name, price, stock) {
  const qty = parseInt(document.getElementById('modal-qty').value) || 1;
  const existing = state.cart.find(item => item.product.id === productId);

  if (existing) {
    const newQty = existing.quantity + qty;
    if (newQty > stock) { showToast(`Only ${stock} units available`, 'error'); return; }
    existing.quantity = newQty;
  } else {
    state.cart.push({ product: { id: productId, name, price, stock }, quantity: qty });
  }

  saveCart();
  updateNavbar();
  closeModal('modal-product-overlay');
  showToast(`✅ Added ${qty}x ${name} to cart!`, 'success');
}

function renderCart() {
  const container = document.getElementById('cart-items-container');
  const summary = document.getElementById('cart-summary');

  if (state.cart.length === 0) {
    document.getElementById('cart-content').innerHTML = `
      <div class="empty-state">
        <div class="icon">🛒</div>
        <h3>Your cart is empty</h3>
        <p>Browse products and add items to your cart</p>
        <button class="btn btn-primary" style="margin-top:16px" onclick="showPage('home')">
          🛍️ Continue Shopping
        </button>
      </div>`;
    return;
  }

  const subtotal = state.cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const shipping = subtotal > 500 ? 0 : 50;
  const total = subtotal + shipping;

  document.getElementById('cart-content').innerHTML = `
    <div class="cart-container">
      <div class="cart-items" id="cart-items-list">
        ${state.cart.map((item, idx) => `
          <div class="cart-item">
            <div class="cart-item-emoji">${getCategoryEmoji('')}</div>
            <div class="cart-item-info">
              <div class="cart-item-name">${item.product.name}</div>
              <div class="cart-item-price">₹${parseFloat(item.product.price).toLocaleString('en-IN')} each</div>
              <div class="qty-control">
                <button class="qty-btn" onclick="updateCartQty(${idx}, -1)">−</button>
                <span style="font-weight:700; min-width:24px; text-align:center">${item.quantity}</span>
                <button class="qty-btn" onclick="updateCartQty(${idx}, 1)">+</button>
                <button class="btn btn-danger btn-sm" style="margin-left:8px" onclick="removeFromCart(${idx})">🗑️</button>
              </div>
            </div>
            <div style="text-align:right">
              <div style="font-weight:800; font-size:16px; color:var(--navy)">
                ₹${(item.product.price * item.quantity).toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="cart-summary">
        <h3 style="font-size:17px; font-weight:700; margin-bottom:16px">Order Summary</h3>
        <div class="summary-row"><span>Subtotal</span><span>₹${subtotal.toLocaleString('en-IN')}</span></div>
        <div class="summary-row"><span>Shipping</span><span>${shipping === 0 ? '<span style="color:var(--success)">FREE</span>' : '₹' + shipping}</span></div>
        ${shipping > 0 ? `<div style="font-size:12px; color:var(--text-secondary); margin-bottom:12px">Free shipping on orders above ₹500</div>` : ''}
        <div class="summary-total">
          <span>Total</span>
          <span>₹${total.toLocaleString('en-IN')}</span>
        </div>
        ${state.user ? `
          <button class="btn btn-amber btn-lg btn-block" style="margin-top:20px" onclick="showCheckout()">
            Proceed to Checkout →
          </button>` : `
          <button class="btn btn-primary btn-lg btn-block" style="margin-top:20px" onclick="showPage('login')">
            Login to Checkout
          </button>`}
        <button class="btn btn-outline btn-block" style="margin-top:10px" onclick="showPage('home')">
          Continue Shopping
        </button>
      </div>
    </div>`;
}

function updateCartQty(idx, delta) {
  const item = state.cart[idx];
  const newQty = item.quantity + delta;
  if (newQty < 1) { removeFromCart(idx); return; }
  if (newQty > item.product.stock) { showToast(`Only ${item.product.stock} units available`, 'error'); return; }
  item.quantity = newQty;
  saveCart();
  renderCart();
  updateNavbar();
}

function removeFromCart(idx) {
  const name = state.cart[idx].product.name;
  state.cart.splice(idx, 1);
  saveCart();
  renderCart();
  updateNavbar();
  showToast(`Removed ${name} from cart`, 'info');
}

// ─── CHECKOUT ─────────────────────────────────────────────────────────────────
function showCheckout() {
  if (!state.user) { showPage('login'); return; }
  const address = state.user.address || '';
  document.getElementById('checkout-address').value = address;

  const subtotal = state.cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const shipping = subtotal > 500 ? 0 : 50;

  document.getElementById('checkout-items-preview').innerHTML =
    state.cart.map(i => `
      <div class="order-item-row">
        <span>${i.product.name} × ${i.quantity}</span>
        <span>₹${(i.product.price * i.quantity).toLocaleString('en-IN')}</span>
      </div>`).join('') +
    `<div class="summary-total" style="margin-top:12px">
      <span>Total</span>
      <span>₹${(subtotal + shipping).toLocaleString('en-IN')}</span>
    </div>`;

  document.getElementById('modal-checkout-overlay').classList.add('open');
}

async function placeOrder() {
  const address = document.getElementById('checkout-address').value.trim();
  const payment = document.getElementById('checkout-payment').value;

  if (!address) { showToast('Please enter shipping address', 'error'); return; }
  if (state.cart.length === 0) { showToast('Cart is empty', 'error'); return; }

  const btn = document.getElementById('place-order-btn');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div> Placing Order...';

  const payload = {
    shipping_address: address,
    payment_method: payment,
    items: state.cart.map(item => ({
      product_id: item.product.id,
      quantity: item.quantity,
    })),
  };

  const { data, ok } = await apiRequest('/orders/', 'POST', payload);
  btn.disabled = false;
  btn.innerHTML = '✅ Place Order';

  if (ok) {
    state.cart = [];
    saveCart();
    updateNavbar();
    closeModal('modal-checkout-overlay');
    showToast(`🎉 Order #${data.id} placed successfully!`, 'success');
    showPage('orders');
    loadMyOrders();
  } else {
    const errorMsg = typeof data === 'object' ? JSON.stringify(data) : data;
    showToast(`Failed: ${errorMsg}`, 'error');
  }
}

// ─── MY ORDERS ────────────────────────────────────────────────────────────────
async function loadMyOrders() {
  const container = document.getElementById('my-orders-list');
  container.innerHTML = '<div class="loading-container">⏳ Loading your orders...</div>';

  const { data, ok } = await apiRequest('/orders/');
  if (!ok) {
    container.innerHTML = `<div class="alert alert-danger">Failed to load orders</div>`;
    return;
  }

  if (!data.orders || data.orders.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">📦</div>
        <h3>No orders yet</h3>
        <p>Place your first order from the store!</p>
        <button class="btn btn-primary" style="margin-top:16px" onclick="showPage('home')">Start Shopping</button>
      </div>`;
    return;
  }

  container.innerHTML = data.orders.map(order => renderOrderCard(order, false)).join('');
}

function renderOrderCard(order, isAdmin = false) {
  const date = new Date(order.created_at).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return `
    <div class="order-card">
      <div class="order-header">
        <div>
          <div class="order-id">Order #${order.id}</div>
          <div class="order-date">${date} ${isAdmin ? `• by <strong>${order.username}</strong>` : ''}</div>
        </div>
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap">
          <span class="status-badge status-${order.status}">${order.status_display || order.status}</span>
          ${!isAdmin && order.status === 'pending' ?
            `<button class="btn btn-danger btn-sm" onclick="cancelOrder(${order.id})">Cancel</button>` : ''}
          ${isAdmin ?
            `<select class="form-control" style="width:auto; padding:4px 8px; font-size:13px"
              onchange="adminUpdateStatus(${order.id}, this.value); this.value='${order.status}'">
              <option value="">Change Status</option>
              <option value="confirmed">Confirmed</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>` : ''}
        </div>
      </div>
      <div class="order-items-list">
        ${order.items.map(item => `
          <div class="order-item-row">
            <span>${item.product_name} × ${item.quantity}</span>
            <span>₹${(item.product_price * item.quantity).toLocaleString('en-IN')}</span>
          </div>
        `).join('')}
      </div>
      <div class="order-footer">
        <div>
          <div style="font-size:12px; color:var(--text-secondary); margin-bottom:2px">Payment: ${order.payment_method.toUpperCase()}</div>
          <div style="font-size:12px; color:var(--text-secondary)">📍 ${order.shipping_address}</div>
        </div>
        <div class="order-total">₹${parseFloat(order.total_amount).toLocaleString('en-IN')}</div>
      </div>
    </div>`;
}

async function cancelOrder(orderId) {
  if (!confirm('Are you sure you want to cancel this order?')) return;
  const { data, ok } = await apiRequest(`/orders/${orderId}/cancel/`, 'POST');
  if (ok) {
    showToast(data.message, 'success');
    loadMyOrders();
  } else {
    showToast(data.error || 'Failed to cancel', 'error');
  }
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
async function login(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  const btn = document.getElementById('login-btn');
  const errDiv = document.getElementById('login-error');

  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div> Signing in...';
  errDiv.style.display = 'none';

  const { data, ok } = await apiRequest('/auth/login/', 'POST', { username, password });

  btn.disabled = false;
  btn.innerHTML = 'Sign In';

  if (ok) {
    saveAuth(data.user, data.tokens.access);
    localStorage.setItem('refresh_token', data.tokens.refresh);
    showToast(`Welcome back, ${data.user.username}! 👋`, 'success');
    updateNavbar();
    if (data.user.role === 'admin') {
      showPage('admin');
      loadAdminDashboard();
    } else {
      showPage('home');
      loadProducts();
    }
  } else {
    const msg = data.non_field_errors?.[0] || data.detail || 'Invalid credentials';
    errDiv.textContent = '❌ ' + msg;
    errDiv.style.display = 'block';
  }
}

async function register(e) {
  e.preventDefault();
  const errDiv = document.getElementById('register-error');
  errDiv.style.display = 'none';

  const payload = {
    username: document.getElementById('reg-username').value,
    email: document.getElementById('reg-email').value,
    password: document.getElementById('reg-password').value,
    password2: document.getElementById('reg-password2').value,
    role: document.getElementById('reg-role').value,
    phone: document.getElementById('reg-phone').value,
  };

  const btn = document.getElementById('register-btn');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div> Creating Account...';

  const { data, ok } = await apiRequest('/auth/register/', 'POST', payload);

  btn.disabled = false;
  btn.innerHTML = 'Create Account';

  if (ok) {
    saveAuth(data.user, data.tokens.access);
    localStorage.setItem('refresh_token', data.tokens.refresh);
    showToast(`Account created! Welcome, ${data.user.username}! 🎉`, 'success');
    updateNavbar();
    showPage('home');
    loadProducts();
  } else {
    const errors = Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`).join(', ');
    errDiv.textContent = '❌ ' + errors;
    errDiv.style.display = 'block';
  }
}

function logout() {
  const refresh = localStorage.getItem('refresh_token');
  if (refresh) apiRequest('/auth/logout/', 'POST', { refresh });
  clearAuth();
  state.cart = [];
  localStorage.removeItem('cart');
  updateNavbar();
  showPage('home');
  loadProducts();
  showToast('Logged out successfully', 'info');
}

// ─── ADMIN DASHBOARD ──────────────────────────────────────────────────────────
async function loadAdminDashboard() {
  showPage('admin');

  // Load stats
  const { data: stats, ok } = await apiRequest('/orders/stats/');
  if (ok) {
    document.getElementById('stat-total-orders').textContent = stats.total_orders;
    document.getElementById('stat-revenue').textContent = '₹' + parseFloat(stats.total_revenue).toLocaleString('en-IN');
    document.getElementById('stat-products').textContent = stats.total_products;
    document.getElementById('stat-customers').textContent = stats.total_customers;
    document.getElementById('stat-pending').textContent = stats.pending_orders;
    document.getElementById('stat-shipped').textContent = stats.shipped_orders;
    document.getElementById('stat-delivered').textContent = stats.delivered_orders;
    document.getElementById('stat-low-stock').textContent = stats.low_stock_products;
  }

  loadAdminOrders();
}

async function loadAdminOrders() {
  const container = document.getElementById('admin-orders-list');
  container.innerHTML = '<div class="loading-container">⏳ Loading...</div>';

  const statusFilter = document.getElementById('admin-status-filter')?.value || '';
  let url = '/orders/all/';
  if (statusFilter) url += `?status=${statusFilter}`;

  const { data, ok } = await apiRequest(url);
  if (ok) {
    if (data.orders.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="icon">📦</div><h3>No orders found</h3></div>';
    } else {
      container.innerHTML = data.orders.map(o => renderOrderCard(o, true)).join('');
    }
  }
}

async function adminUpdateStatus(orderId, newStatus) {
  if (!newStatus) return;
  const { data, ok } = await apiRequest(`/orders/${orderId}/status/`, 'PUT', { status: newStatus });
  if (ok) {
    showToast(`Order #${orderId} → ${newStatus}`, 'success');
    loadAdminOrders();
  } else {
    showToast('Failed to update status', 'error');
  }
}

async function loadAdminProducts() {
  const container = document.getElementById('admin-products-table-body');
  container.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px">⏳ Loading...</td></tr>';

  const { data, ok } = await apiRequest('/products/');
  if (!ok) return;

  // Admins can see all products including inactive
  const { data: allData } = await apiRequest('/products/?');
  const products = allData.products || data.products || [];

  container.innerHTML = products.map(p => `
    <tr>
      <td><strong>#${p.id}</strong></td>
      <td>
        <div style="font-weight:600">${p.name}</div>
        <div style="font-size:12px; color:var(--text-secondary)">${p.category_name || '-'}</div>
      </td>
      <td>₹${parseFloat(p.price).toLocaleString('en-IN')}</td>
      <td>
        <span class="${p.stock < 5 ? 'stock-badge out-stock' : 'stock-badge in-stock'}">${p.stock}</span>
      </td>
      <td>
        <span class="status-badge ${p.is_active ? 'status-delivered' : 'status-cancelled'}">
          ${p.is_active ? 'Active' : 'Hidden'}
        </span>
      </td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="showEditProduct(${p.id})">✏️ Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deactivateProduct(${p.id}, '${p.name}')">🗑️</button>
      </td>
    </tr>
  `).join('');
}

async function showAddProductForm() {
  await loadCategoriesForAdmin();
  document.getElementById('product-form-title').textContent = '➕ Add New Product';
  document.getElementById('product-form').reset();
  document.getElementById('product-form-id').value = '';
  document.getElementById('modal-add-product-overlay').classList.add('open');
}

async function showEditProduct(productId) {
  const { data, ok } = await apiRequest(`/products/${productId}/`);
  if (!ok) return;

  await loadCategoriesForAdmin();
  document.getElementById('product-form-title').textContent = '✏️ Edit Product';
  document.getElementById('product-form-id').value = data.id;
  document.getElementById('pf-name').value = data.name;
  document.getElementById('pf-price').value = data.price;
  document.getElementById('pf-stock').value = data.stock;
  document.getElementById('pf-category').value = data.category || '';
  document.getElementById('pf-description').value = data.description;
  document.getElementById('pf-active').checked = data.is_active;
  document.getElementById('modal-add-product-overlay').classList.add('open');
}

async function loadCategoriesForAdmin() {
  if (state.categories.length === 0) await loadCategories();
  const select = document.getElementById('pf-category');
  select.innerHTML = '<option value="">Select Category</option>' +
    state.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

async function saveProduct(e) {
  e.preventDefault();
  const id = document.getElementById('product-form-id').value;
  const payload = {
    name: document.getElementById('pf-name').value,
    price: document.getElementById('pf-price').value,
    stock: document.getElementById('pf-stock').value,
    category: document.getElementById('pf-category').value || null,
    description: document.getElementById('pf-description').value,
    is_active: document.getElementById('pf-active').checked,
  };

  const url = id ? `/products/${id}/` : '/products/';
  const method = id ? 'PUT' : 'POST';

  const { data, ok } = await apiRequest(url, method, payload);
  if (ok) {
    closeModal('modal-add-product-overlay');
    showToast(id ? 'Product updated!' : 'Product created!', 'success');
    loadAdminProducts();
  } else {
    const errors = Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`).join(', ');
    showToast('Error: ' + errors, 'error');
  }
}

async function deactivateProduct(id, name) {
  if (!confirm(`Deactivate "${name}"? It will be hidden from the store.`)) return;
  const { ok } = await apiRequest(`/products/${id}/`, 'DELETE');
  if (ok) {
    showToast(`"${name}" deactivated`, 'success');
    loadAdminProducts();
  } else {
    showToast('Failed to deactivate', 'error');
  }
}

async function addCategory() {
  const name = document.getElementById('new-category-name').value.trim();
  if (!name) return;
  const { data, ok } = await apiRequest('/products/categories/', 'POST', { name });
  if (ok) {
    showToast(`Category "${name}" created!`, 'success');
    document.getElementById('new-category-name').value = '';
    loadCategories();
  } else {
    showToast(data.name?.[0] || 'Failed to create category', 'error');
  }
}

// ─── MODAL HELPERS ────────────────────────────────────────────────────────────
function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('open');
}

// ─── ADMIN TABS ───────────────────────────────────────────────────────────────
function switchAdminTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.admin-tab-content').forEach(t => t.style.display = 'none');
  document.getElementById(`admin-tab-${tab}`).style.display = 'block';
  event.target.classList.add('active');

  if (tab === 'products') loadAdminProducts();
  else if (tab === 'orders') loadAdminOrders();
  else if (tab === 'categories') loadCategories();
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  loadAuth();
  loadCart();
  updateNavbar();
  loadProducts();
  loadCategories();

  // Click outside modal to close
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });
});