/* ==========================================================
   MIT Campus Exchange Hub — script.js
   ----------------------------------------------------------
   Full-Stack Client Controller:
     • Backend REST API integration (Authentication, Products,
       Bidding/Auctions, Requests, Chats, Reviews, Reports, Admin)
     • JWT token session handling
     • Single-Page Navigation with History API
     • Real-time auction countdown timers
     • Live image uploads and instant fallback handling
   ========================================================== */

'use strict';

/* ==========================================================
   1. GLOBAL STATE & SESSION
   ========================================================== */

const TOKEN_KEY = 'mit_exchange_hub_jwt_token_v2';
const USER_KEY = 'mit_exchange_hub_user_v2';

let currentUser = null;       // { id, name, email, role, department, year, isVerified, rating }
let currentView = 'home';     // router view
let currentParam = null;

let searchTerm = '';          // search / filter state
let activeCategory = 'All';
let activeCondition = 'All';
let activeListingType = 'All';
let activePricingModel = 'All';
let activeSort = 'newest';

let editingProductId = null;  // Sell Item form edit mode
let activeConversationId = null;
let requestTab = 'sent';
let adminSection = 'overview';
let adminListingQuery = '';
let adminListingFilter = 'all';
let confirmCallback = null;

let countdownInterval = null; // interval timer for live auctions
let chatPollInterval = null;  // interval timer for real-time chat

const VIEW_IDS = {
  home: 'view-home',
  browse: 'view-browse',
  details: 'view-details',
  sell: 'view-sell',
  listings: 'view-listings',
  chats: 'view-chats',
  requests: 'view-requests',
  wishlist: 'view-wishlist',
  profile: 'view-profile',
  notifications: 'view-notifications',
  report: 'view-report',
  tech: 'view-tech'
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* ==========================================================
   2. DOM & UTILITY HELPERS
   ========================================================== */

function $(id) { return document.getElementById(id); }
function $$(selector, root) {
  return Array.prototype.slice.call((root || document).querySelectorAll(selector));
}

function esc(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function money(amount) {
  if (amount === 0 || amount === '0') return 'FREE';
  return '\u20B9' + Number(amount || 0).toLocaleString('en-IN');
}

function initials(name) {
  const parts = String(name || '?').trim().split(/\s+/);
  return ((parts[0] || '?')[0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
}

function prefersReducedMotion() {
  return typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* ==========================================================
   3. TOASTS & CONFIRMATION MODAL
   ========================================================== */

function toast(message, type = 'info') {
  const container = $('toastContainer');
  if (!container) return;
  const box = document.createElement('div');
  box.className = 'toast ' + type;
  box.textContent = message;
  container.appendChild(box);
  window.setTimeout(() => {
    box.classList.add('fade-out');
    window.setTimeout(() => box.remove(), 320);
  }, 3500);
}

function askConfirm(title, text, confirmLabel, onConfirm, customHtml = '') {
  $('modalTitle').textContent = title;
  $('modalText').textContent = text;
  $('modalCustomContent').innerHTML = customHtml || '';
  $('modalConfirmBtn').textContent = confirmLabel || 'Confirm';
  confirmCallback = onConfirm;
  $('modalRoot').classList.remove('hidden');
}

function closeConfirm() {
  $('modalRoot').classList.add('hidden');
  $('modalCustomContent').innerHTML = '';
  confirmCallback = null;
}

/* ==========================================================
   4. REST API CLIENT (Fetch wrapper with JWT handling)
   ========================================================== */

function getAuthHeader() {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

async function apiRequest(endpoint, method = 'GET', body = null, isFormData = false) {
  const headers = { ...getAuthHeader() };
  if (!isFormData && body) {
    headers['Content-Type'] = 'application/json';
  }

  const options = {
    method,
    headers
  };

  if (body) {
    options.body = isFormData ? body : JSON.stringify(body);
  }

  try {
    const res = await fetch(`/api${endpoint}`, options);
    const data = await res.json().catch(() => ({}));

    if (res.status === 401 && currentUser) {
      // Session expired
      logout(false);
      toast('Your session has expired. Please log in again.', 'warn');
      throw new Error('Session expired.');
    }

    if (!res.ok) {
      throw new Error(data.message || `Request failed with status ${res.status}`);
    }

    return data;
  } catch (err) {
    throw err;
  }
}

const api = {
  get: (endpoint) => apiRequest(endpoint, 'GET'),
  post: (endpoint, body) => apiRequest(endpoint, 'POST', body),
  put: (endpoint, body) => apiRequest(endpoint, 'PUT', body),
  patch: (endpoint, body) => apiRequest(endpoint, 'PATCH', body),
  delete: (endpoint) => apiRequest(endpoint, 'DELETE'),
  upload: (formData) => apiRequest('/upload', 'POST', formData, true)
};

/* ==========================================================
   5. AUTHENTICATION & SESSION MANAGEMENT
   ========================================================== */

function saveSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  currentUser = user;
}

function loadSession() {
  const token = localStorage.getItem(TOKEN_KEY);
  const userJson = localStorage.getItem(USER_KEY);
  if (token && userJson) {
    try {
      currentUser = JSON.parse(userJson);
    } catch (e) {
      currentUser = null;
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  }
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  currentUser = null;
}

function showAuthScreen() {
  $('authScreen').classList.remove('hidden');
  $('appShell').classList.add('hidden');
  $('adminShell').classList.add('hidden');
  $('userMenu').classList.add('hidden');
  $('loginForm').classList.remove('hidden');
  $('registerForm').classList.add('hidden');
  $('loginError').classList.add('hidden');
  $('registerError').classList.add('hidden');
  document.body.classList.remove('admin-mode');
}

function showStudentShell() {
  $('authScreen').classList.add('hidden');
  $('adminShell').classList.add('hidden');
  $('appShell').classList.remove('hidden');

  $('userChipName').textContent = currentUser.name;
  $('userChipAvatar').textContent = initials(currentUser.name);

  // Admin switch button in topbar if admin
  const right = document.querySelector('.topbar-right');
  let adminBtn = $('toAdminBtn');
  if (currentUser.role === 'admin') {
    if (!adminBtn) {
      adminBtn = document.createElement('button');
      adminBtn.id = 'toAdminBtn';
      adminBtn.type = 'button';
      adminBtn.className = 'icon-btn';
      adminBtn.innerHTML = '<span aria-hidden="true">\u2B05</span><span class="icon-btn-text">Admin Panel</span>';
      adminBtn.addEventListener('click', () => showAdminShell());
      right.insertBefore(adminBtn, right.firstChild);
    }
    adminBtn.classList.remove('hidden');
  } else if (adminBtn) {
    adminBtn.remove();
  }

  updateBadges();
}

function showAdminShell() {
  if (!currentUser || currentUser.role !== 'admin') {
    toast('The admin dashboard is restricted to administrators.', 'error');
    return;
  }
  $('authScreen').classList.add('hidden');
  $('appShell').classList.add('hidden');
  $('adminShell').classList.remove('hidden');
  $('userMenu').classList.add('hidden');
  $('adminNameLabel').textContent = currentUser.name;
  renderAdmin();
}

async function handleLogin(event) {
  event.preventDefault();
  const errorBox = $('loginError');
  const email = $('loginEmail').value.trim().toLowerCase();
  const password = $('loginPassword').value;

  errorBox.classList.add('hidden');

  if (!email || !password) {
    errorBox.textContent = 'Please enter both your institute email and password.';
    errorBox.classList.remove('hidden');
    return;
  }

  try {
    const data = await api.post('/auth/login', { email, password });
    saveSession(data.token, data.user);

    toast(data.message || `Welcome, ${data.user.name}!`, 'success');

    if (data.user.role === 'admin') {
      adminSection = 'overview';
      showAdminShell();
    } else {
      showStudentShell();
      navigate('home');
    }
  } catch (err) {
    errorBox.textContent = err.message || 'Login failed.';
    errorBox.classList.remove('hidden');
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const errorBox = $('registerError');
  const role = $('regRole').value;
  const name = $('regName').value.trim();
  const email = $('regEmail').value.trim().toLowerCase();
  const password = $('regPassword').value;
  const department = $('regDepartment').value;
  const year = $('regYear').value;

  errorBox.classList.add('hidden');

  if (!name || !email || !password || !department) {
    errorBox.textContent = 'Please fill in all required fields.';
    errorBox.classList.remove('hidden');
    return;
  }

  try {
    const data = await api.post('/auth/register', {
      name,
      email,
      password,
      department,
      year,
      role
    });

    saveSession(data.token, data.user);
    toast(data.message || 'Account created successfully!', 'success');
    $('registerForm').reset();

    showStudentShell();
    navigate('home');
  } catch (err) {
    errorBox.textContent = err.message || 'Registration failed.';
    errorBox.classList.remove('hidden');
  }
}

function logout(showToast = true) {
  const who = currentUser ? currentUser.name : '';
  clearSession();
  editingProductId = null;
  activeConversationId = null;
  searchTerm = '';
  activeCategory = 'All';
  activeCondition = 'All';
  activeListingType = 'All';
  activePricingModel = 'All';
  activeSort = 'newest';

  if (countdownInterval) clearInterval(countdownInterval);
  if (chatPollInterval) clearInterval(chatPollInterval);

  $('loginEmail').value = '';
  $('loginPassword').value = '';
  showAuthScreen();
  if (showToast) toast(who ? `Logged out of ${who}.` : 'Logged out.', 'info');
}

/* ==========================================================
   6. ROUTER (Single-Page Navigation with History API)
   ========================================================= */

function navigate(view, param = null, options = {}) {
  if (!VIEW_IDS[view]) view = 'home';
  currentView = view;
  currentParam = param;

  const hash = '#/' + view + (currentParam ? '/' + currentParam : '');
  try {
    if (options.replace) {
      history.replaceState({ view, param: currentParam }, '', hash);
    } else if (!options.fromHistory) {
      history.pushState({ view, param: currentParam }, '', hash);
    }
  } catch (error) { /* legacy browser fallback */ }

  renderCurrentView();
}

function parseHash() {
  const raw = (location.hash || '').replace(/^#\/?/, '');
  if (!raw) return { view: 'home', param: null };
  const parts = raw.split('/');
  const view = VIEW_IDS[parts[0]] ? parts[0] : 'home';
  return { view, param: parts[1] || null };
}

function goToView(view) {
  const adminVisible = !$('adminShell').classList.contains('hidden');
  if (adminVisible && currentUser && currentUser.role === 'admin') {
    showStudentShell();
  }
  navigate(view);
}

async function renderCurrentView() {
  // Clear any existing polling/timers
  if (chatPollInterval) {
    clearInterval(chatPollInterval);
    chatPollInterval = null;
  }

  Object.keys(VIEW_IDS).forEach(key => {
    const section = $(VIEW_IDS[key]);
    if (section) section.classList.add('hidden');
  });

  const target = $(VIEW_IDS[currentView]);
  if (!target) return;
  target.classList.remove('hidden');
  target.innerHTML = '<div class="center" style="padding:40px;"><span class="pill">Loading campus data...</span></div>';

  $$('.nav-item').forEach(button => {
    button.classList.toggle('active', button.dataset.view === currentView);
  });

  try {
    const html = await buildView(currentView);
    target.innerHTML = html;

    // Start live countdown ticker if on details or browse
    startAuctionCountdownTicker();

    if (currentView === 'chats') {
      scrollChatToBottom();
      // Poll chat messages every 4 seconds while active
      chatPollInterval = setInterval(refreshActiveChat, 4000);
    }

    try {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    } catch (e) {
      window.scrollTo(0, 0);
    }
  } catch (err) {
    target.innerHTML = emptyState('⚠️', 'Error loading view', err.message,
      '<button type="button" class="btn btn-primary" onclick="renderCurrentView()">Try Again</button>');
  }

  updateBadges();
}

async function buildView(view) {
  switch (view) {
    case 'browse':        return await buildBrowseView();
    case 'details':       return await buildDetailsView(currentParam);
    case 'sell':          return await buildSellView();
    case 'listings':      return await buildListingsView();
    case 'chats':         return await buildChatsView();
    case 'requests':      return await buildRequestsView();
    case 'wishlist':      return await buildWishlistView();
    case 'profile':       return await buildProfileView();
    case 'notifications': return await buildNotificationsView();
    case 'report':        return await buildReportView(currentParam);
    case 'tech':          return buildTechView();
    default:              return await buildHomeView();
  }
}

/* ==========================================================
   7. LIVE AUCTION COUNTDOWN TICKER
   ========================================================== */

function formatCountdown(endDate) {
  const diff = new Date(endDate) - new Date();
  if (diff <= 0) return { expired: true, text: 'Auction Closed' };

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  let text = '';
  if (days > 0) text += `${days}d `;
  text += `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;

  return { expired: false, text, urgent: diff < 3600000 };
}

function startAuctionCountdownTicker() {
  if (countdownInterval) clearInterval(countdownInterval);

  const updateTickers = () => {
    const elements = $$('[data-countdown]');
    elements.forEach(el => {
      const end = el.dataset.countdown;
      if (!end) return;
      const res = formatCountdown(end);
      el.textContent = res.text;
      if (res.urgent) el.classList.add('countdown-urgent');
      if (res.expired) {
        el.classList.remove('countdown-urgent');
        el.classList.add('muted');
      }
    });
  };

  updateTickers();
  countdownInterval = setInterval(updateTickers, 1000);
}

/* ==========================================================
   8. SHARED COMPONENTS & PRODUCT CARDS
   ========================================================== */

function emptyState(icon, title, message, actionHtml = '') {
  return `<div class="empty-state">
    <span class="empty-icon" aria-hidden="true">${icon}</span>
    <h3>${esc(title)}</h3>
    <p>${esc(message)}</p>
    ${actionHtml}
  </div>`;
}

function productCard(p) {
  const isBidding = p.pricingModel === 'bidding';
  const isAuctionActive = isBidding && p.auctionStatus === 'active';
  const sold = ['sold', 'exchanged', 'rented', 'donated'].includes(p.status);
  const saved = (currentUser?.wishlist || []).includes(p.id || p._id);

  let typeBadge = '';
  if (isBidding) {
    typeBadge = `<span class="pill pill-bidding">⚡ Auction (${p.bidsCount || 0} bids)</span>`;
  } else if (p.listingType === 'Rent') {
    typeBadge = `<span class="pill pill-rent">🔄 Rent</span>`;
  } else if (p.listingType === 'Exchange') {
    typeBadge = `<span class="pill pill-exchange">🔀 Exchange</span>`;
  } else if (p.listingType === 'Donation') {
    typeBadge = `<span class="pill pill-donation">🎁 Free Donation</span>`;
  }

  const priceLabel = isBidding
    ? (p.bidsCount > 0 ? `Current Bid: ${money(p.currentHighestBid)}` : `Starts at: ${money(p.startingBid)}`)
    : money(p.price);

  return `
  <article class="product-card ${sold ? 'is-sold' : ''}">
    <div class="product-media">
      <img src="${esc(p.image || '')}" alt="${esc(p.name)}" loading="lazy">
      <span class="pill status-tag ${sold ? 'pill-sold' : 'pill-available'}">${sold ? 'Sold' : 'Available'}</span>
      ${isBidding ? '<span class="pill bidding-tag pill-bidding">🔨 Auction</span>' : ''}
    </div>
    <div class="product-body">
      <h3 class="product-name">${esc(p.name)}</h3>
      <div class="product-price-row">
        <div class="product-price">${priceLabel}</div>
        ${isBidding ? `<div class="product-bids-badge">${p.bidsCount || 0} bid(s)</div>` : ''}
      </div>
      <div class="product-meta">
        <span class="pill pill-cat">${esc(p.category)}</span>
        <span class="pill pill-condition">${esc(p.condition)}</span>
        ${typeBadge}
      </div>
      ${isAuctionActive && p.auctionEnd ? `
        <div class="product-countdown">
          ⏳ <span data-countdown="${esc(p.auctionEnd)}">Calculating...</span>
        </div>
      ` : ''}
      <div class="product-seller">Listed by ${esc(p.sellerName || p.sellerEmail)}</div>
      <div class="product-actions">
        <button type="button" class="btn btn-primary btn-sm" data-action="open-product" data-id="${esc(p.id || p._id)}">
          ${isBidding ? '🔨 View &amp; Bid' : 'View Details'}
        </button>
        <button type="button" class="btn ${saved ? 'btn-danger-soft' : 'btn-ghost'} btn-sm" data-action="toggle-wishlist" data-id="${esc(p.id || p._id)}">
          ${saved ? '❤️ Saved' : '🤍 Wishlist'}
        </button>
      </div>
    </div>
  </article>`;
}

function productGrid(list, emptyTitle, emptyMessage) {
  if (!list || !list.length) {
    return emptyState('🔍',
      emptyTitle || 'No products match your criteria',
      emptyMessage || 'Try modifying your filters, search term or post an item yourself.',
      '<button type="button" class="btn btn-primary" data-action="clear-filters">Clear all filters</button>');
  }
  return `<div class="product-grid">${list.map(productCard).join('')}</div>`;
}

function categoryChips() {
  const options = ['All', ...SAMPLE_CATEGORIES];
  return `<div class="chips">${options.map(cat => `
    <button type="button" class="chip ${activeCategory === cat ? 'active' : ''}" data-action="set-category" data-id="${esc(cat)}">
      ${esc(cat)}
    </button>
  `).join('')}</div>`;
}

function sortSelect(id) {
  const options = [
    ['newest', 'Newest first'],
    ['price-asc', 'Price: low to high'],
    ['price-desc', 'Price: high to low'],
    ['ending-soonest', 'Auctions ending soonest'],
    ['most-bids', 'Most bids']
  ];
  return `<select id="${id}" data-input="sort">${options.map(pair => `
    <option value="${pair[0]}" ${activeSort === pair[0] ? 'selected' : ''}>${esc(pair[1])}</option>
  `).join('')}</select>`;
}

async function updateBadges() {
  if (!currentUser) return;
  try {
    const data = await api.get('/notifications');
    const count = data.unreadCount || 0;
    ['navBadge', 'navBadgeTop'].forEach(id => {
      const badge = $(id);
      if (!badge) return;
      badge.textContent = count;
      badge.classList.toggle('hidden', count === 0);
    });
  } catch (e) { /* ignore badge update errors */ }
}

/* ==========================================================
   9. VIEW: HOME
   ========================================================== */

async function buildHomeView() {
  const [prodData, reqData] = await Promise.all([
    api.get('/products?status=all'),
    api.get('/requests').catch(() => ({ requests: [] }))
  ]);

  const allProducts = prodData.products || [];
  const available = allProducts.filter(p => p.status === 'available');
  const activeAuctions = allProducts.filter(p => p.pricingModel === 'bidding' && p.auctionStatus === 'active');
  const myListings = allProducts.filter(p => p.sellerEmail === currentUser.email);
  const myWishlistCount = (currentUser.wishlist || []).length;

  // Filter for display
  let displayed = [...allProducts];
  if (activeCategory !== 'All') {
    displayed = displayed.filter(p => p.category === activeCategory);
  }
  if (searchTerm.trim()) {
    const t = searchTerm.trim().toLowerCase();
    displayed = displayed.filter(p => `${p.name} ${p.category} ${p.description}`.toLowerCase().includes(t));
  }

  return `
  <section class="hero">
    <h2>Welcome back, ${esc(currentUser.name.split(' ')[0])} 👋</h2>
    <p>MIT Campus Exchange Hub connects students and staff for buying, selling, renting, exchanging and bidding on academic items right inside the campus.</p>
    <div class="hero-actions">
      <button type="button" class="btn btn-primary btn-lg" data-view="sell">➕ Post Listing / Auction</button>
      <button type="button" class="btn btn-ghost btn-lg" data-view="browse">🔍 Browse All Items</button>
      <button type="button" class="btn btn-ghost btn-lg" data-view="requests">📦 My Requests (${(reqData.requests || []).length})</button>
    </div>
  </section>

  <div class="stat-grid">
    <div class="stat-card accent">
      <div class="stat-value">${allProducts.length}</div>
      <div class="stat-label">Total Listings</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${available.length}</div>
      <div class="stat-label">Available Now</div>
    </div>
    <div class="stat-card" style="background: #fffbeb; border-color: #fde68a;">
      <div class="stat-value" style="color: #b45309;">${activeAuctions.length}</div>
      <div class="stat-label" style="color: #92400e; font-weight: 600;">⚡ Active Auctions</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${myListings.length}</div>
      <div class="stat-label">Your Listings</div>
    </div>
  </div>

  <h3 class="section-title">Explore Campus Marketplace</h3>

  <div class="toolbar">
    <div class="toolbar-row">
      <label class="field toolbar-search">
        <span class="field-label">Search items or notes</span>
        <input type="search" id="homeSearch" data-input="search" value="${esc(searchTerm)}" placeholder="e.g. calculator, mathematics, gate notes">
      </label>
      <label class="field toolbar-field">
        <span class="field-label">Sort by</span>
        ${sortSelect('homeSort')}
      </label>
    </div>
    ${categoryChips()}
  </div>

  <div class="product-grid-area" id="homeGrid">
    ${productGrid(displayed)}
  </div>`;
}

/* ==========================================================
   10. VIEW: BROWSE
   ========================================================== */

async function buildBrowseView() {
  const queryParams = new URLSearchParams({
    search: searchTerm,
    category: activeCategory,
    condition: activeCondition,
    listingType: activeListingType,
    pricingModel: activePricingModel,
    sort: activeSort,
    status: 'all'
  });

  const data = await api.get(`/products?${queryParams.toString()}`);
  const products = data.products || [];

  return `
  <div class="page-head">
    <div>
      <h2 class="page-title">Browse Campus Items</h2>
      <p class="page-sub">Explore textbooks, lab gear, notes, electronics and ongoing auctions.</p>
    </div>
    <button type="button" class="btn btn-primary" data-view="sell">➕ Post Listing / Auction</button>
  </div>

  <div class="toolbar">
    <div class="toolbar-row">
      <label class="field toolbar-search">
        <span class="field-label">Search keyword</span>
        <input type="search" id="browseSearch" data-input="search" value="${esc(searchTerm)}" placeholder="Search by name, author, topic...">
      </label>
      <label class="field toolbar-field">
        <span class="field-label">Category</span>
        <select data-input="category">
          ${['All', ...SAMPLE_CATEGORIES].map(cat => `
            <option value="${esc(cat)}" ${activeCategory === cat ? 'selected' : ''}>${esc(cat)}</option>
          `).join('')}
        </select>
      </label>
      <label class="field toolbar-field">
        <span class="field-label">Condition</span>
        <select data-input="condition">
          ${['All', ...SAMPLE_CONDITIONS].map(c => `
            <option value="${esc(c)}" ${activeCondition === c ? 'selected' : ''}>${esc(c)}</option>
          `).join('')}
        </select>
      </label>
      <label class="field toolbar-field">
        <span class="field-label">Listing Type</span>
        <select data-input="listingType">
          ${['All', 'Sale', 'Rent', 'Exchange', 'Donation'].map(t => `
            <option value="${esc(t)}" ${activeListingType === t ? 'selected' : ''}>${esc(t)}</option>
          `).join('')}
        </select>
      </label>
      <label class="field toolbar-field">
        <span class="field-label">Pricing Model</span>
        <select data-input="pricingModel">
          <option value="All" ${activePricingModel === 'All' ? 'selected' : ''}>All (Fixed &amp; Bidding)</option>
          <option value="fixed" ${activePricingModel === 'fixed' ? 'selected' : ''}>Fixed Price Only</option>
          <option value="bidding" ${activePricingModel === 'bidding' ? 'selected' : ''}>🔨 Bidding / Auction Only</option>
        </select>
      </label>
      <label class="field toolbar-field">
        <span class="field-label">Sort by</span>
        ${sortSelect('browseSort')}
      </label>
      <div class="toolbar-actions">
        <button type="button" class="btn btn-ghost" data-action="clear-filters">Clear</button>
      </div>
    </div>
  </div>

  <p class="muted small mb-1" id="browseCounter">${products.length} item(s) found.</p>
  <div class="product-grid-area mt-2" id="browseGrid">
    ${productGrid(products)}
  </div>`;
}

/* ==========================================================
   11. VIEW: PRODUCT DETAILS & LIVE BIDDING
   ========================================================== */

async function buildDetailsView(productId) {
  if (!productId) {
    return emptyState('❓', 'Listing not found', 'No product ID provided.',
      '<button type="button" class="btn btn-primary" data-view="browse">Browse Items</button>');
  }

  const data = await api.get(`/products/${productId}`);
  const product = data.product;

  const sold = ['sold', 'exchanged', 'rented', 'donated'].includes(product.status);
  const mine = product.sellerEmail === currentUser.email;
  const saved = (currentUser.wishlist || []).includes(product.id || product._id);
  const isAuction = product.pricingModel === 'bidding';
  const isAuctionActive = isAuction && product.auctionStatus === 'active';
  const isHighestBidder = isAuction && product.highestBidderEmail === currentUser.email;

  // Seller info
  const seller = product.sellerDetails || {
    name: product.sellerName || product.sellerEmail,
    department: product.sellerDepartment || 'Department',
    year: 'Campus Member',
    rating: 5.0,
    ratingsCount: 0
  };

  // Min next bid calculation
  let minNextBid = 0;
  if (isAuction) {
    minNextBid = (product.bidsCount > 0)
      ? (product.currentHighestBid + (product.minIncrement || 10))
      : (product.startingBid || 1);
  }

  // Bids history table
  let bidHistoryHtml = '';
  if (isAuction) {
    const bids = product.bids || [];
    if (bids.length > 0) {
      bidHistoryHtml = `
      <div class="bid-history-list">
        <div style="font-weight:700;font-size:12.5px;color:#92400e;margin-bottom:6px;">Bidding History (${bids.length} bids)</div>
        ${bids.map((b, idx) => `
          <div class="bid-history-item">
            <span><strong>${idx === 0 ? '🏆 ' : ''}${esc(b.bidderName)}</strong> ${b.bidderEmail === currentUser.email ? '<span class="pill pill-sm">You</span>' : ''}</span>
            <span>${money(b.amount)}</span>
            <span class="muted small">${new Date(b.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        `).join('')}
      </div>`;
    } else {
      bidHistoryHtml = '<p class="muted small" style="margin-top:10px;">No bids placed yet. Be the first to place a bid!</p>';
    }
  }

  // Seller Reviews
  const reviews = product.sellerReviews || [];
  const reviewsHtml = reviews.length > 0 ? `
    <div class="mt-3">
      <h3 class="card-title">Seller Reviews &amp; Ratings (${reviews.length})</h3>
      ${reviews.slice(0, 3).map(r => `
        <div class="review-card">
          <div class="review-header">
            <span class="review-author">${esc(r.reviewerName)}</span>
            <span class="review-stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span>
          </div>
          <div class="review-comment">${esc(r.comment || 'Verified transaction completed.')}</div>
          <div class="review-date">${esc(r.date)} · Verified deal for ${esc(r.productName)}</div>
        </div>
      `).join('')}
    </div>
  ` : '';

  return `
  <button type="button" class="back-link" data-view="browse">← Back to Marketplace</button>

  <div class="details-layout">
    <div class="details-media">
      <img src="${esc(product.image || '')}" alt="${esc(product.name)}">
    </div>

    <div class="card">
      <div class="product-meta">
        <span class="pill ${sold ? 'pill-sold' : 'pill-available'}">${sold ? 'Sold' : 'Available'}</span>
        <span class="pill pill-cat">${esc(product.category)}</span>
        <span class="pill pill-condition">${esc(product.condition)}</span>
        ${isAuction ? '<span class="pill pill-bidding">⚡ Live Auction</span>' : ''}
        ${product.listingType !== 'Sale' ? `<span class="pill">${esc(product.listingType)}</span>` : ''}
      </div>

      <h2 class="page-title mt-1">${esc(product.name)}</h2>

      ${!isAuction ? `
        <div class="details-price">${money(product.price)}</div>
      ` : ''}

      <!-- AUCTION SYSTEM WIDGET -->
      ${isAuction ? `
        <div class="auction-box">
          <div class="auction-header">
            <span class="auction-badge">🔨 Product Auction / Bidding</span>
            ${isAuctionActive ? `
              <span class="countdown-ticker" data-countdown="${esc(product.auctionEnd)}">Calculating...</span>
            ` : '<span class="pill pill-sold">Auction Completed</span>'}
          </div>

          <div class="bid-stats-grid">
            <div class="bid-stat">
              <div class="bid-stat-val">${product.bidsCount > 0 ? money(product.currentHighestBid) : 'No bids yet'}</div>
              <div class="bid-stat-lbl">${product.bidsCount > 0 ? 'Current Highest Bid' : `Starting Bid: ${money(product.startingBid)}`}</div>
            </div>
            <div class="bid-stat">
              <div class="bid-stat-val">${product.bidsCount || 0}</div>
              <div class="bid-stat-lbl">Total Bids Placed</div>
            </div>
          </div>

          ${isHighestBidder ? `
            <div class="bid-leader-banner">
              🎉 <strong>You currently have the highest bid!</strong> Stay tuned until the auction closes.
            </div>
          ` : ''}

          ${isAuctionActive && !mine ? `
            <form class="bid-form" data-form="place-bid" data-id="${esc(product.id || product._id)}">
              <input type="number" id="bidAmountInput" min="${minNextBid}" step="1" value="${minNextBid}" placeholder="₹ Bid amount">
              <button type="submit" class="btn btn-gold">Place Bid (Min ${money(minNextBid)})</button>
            </form>
            <span class="field-hint">Minimum increment: ${money(product.minIncrement || 10)}. Bids are final and verified on server.</span>
          ` : ''}

          ${mine ? '<p class="small muted">You are the seller of this auction listing.</p>' : ''}
          ${!isAuctionActive ? `
            <div class="p-2 mt-1" style="background:#fff;border-radius:8px;padding:10px;">
              <strong>Winner:</strong> ${esc(product.winnerName || 'No winning bidder')} ${product.winningBid ? `(${money(product.winningBid)})` : ''}
            </div>
          ` : ''}

          ${bidHistoryHtml}
        </div>
      ` : ''}

      <div class="details-list">
        <div class="details-row"><span>Listing Type</span><span><strong>${esc(product.listingType || 'Sale')}</strong></span></div>
        ${product.exchangeFor ? `<div class="details-row"><span>Looking to Exchange For</span><span>${esc(product.exchangeFor)}</span></div>` : ''}
        ${product.rentalPeriod ? `<div class="details-row"><span>Rental Duration / Terms</span><span>${esc(product.rentalPeriod)}</span></div>` : ''}
        <div class="details-row"><span>Category</span><span>${esc(product.category)}</span></div>
        <div class="details-row"><span>Condition</span><span>${esc(product.condition)}</span></div>
        <div class="details-row"><span>Listed on</span><span>${new Date(product.createdAt).toLocaleDateString('en-GB')}</span></div>
      </div>

      <h3 class="card-title">Item Description</h3>
      <p class="muted" style="white-space: pre-line;">${esc(product.description)}</p>

      <div class="seller-box">
        <span class="avatar">${initials(seller.name)}</span>
        <div>
          <div><strong>${esc(seller.name)}</strong></div>
          <div class="small muted">${esc(seller.department)} · ${esc(seller.year)}</div>
          <div class="star-rating">
            ★ ${seller.rating || 5.0} / 5.0 <span class="muted small">(${seller.ratingsCount || 0} reviews)</span>
          </div>
        </div>
      </div>

      <div class="details-actions">
        ${!mine ? `
          <button type="button" class="btn btn-primary" data-action="start-chat" data-id="${esc(product.id || product._id)}">
            💬 Chat with Seller
          </button>
          ${!isAuction && !sold ? `
            <button type="button" class="btn btn-success" data-action="send-request" data-id="${esc(product.id || product._id)}">
              📦 Send Purchase / Request
            </button>
          ` : ''}
        ` : `
          <button type="button" class="btn btn-soft" data-action="edit-listing" data-id="${esc(product.id || product._id)}">
            ✏️ Edit Listing
          </button>
        `}

        <button type="button" class="btn ${saved ? 'btn-danger-soft' : 'btn-ghost'}" data-action="toggle-wishlist" data-id="${esc(product.id || product._id)}">
          ${saved ? '❤️ Remove from Wishlist' : '🤍 Save to Wishlist'}
        </button>

        ${!mine ? `
          <button type="button" class="btn btn-warn-soft" data-action="report-product" data-id="${esc(product.id || product._id)}">
            🚩 Report Listing
          </button>
        ` : ''}
      </div>

      ${reviewsHtml}
    </div>
  </div>`;
}

/* ==========================================================
   12. VIEW: SELL / POST LISTING & AUCTION
   ========================================================== */

async function buildSellView() {
  let draft = {
    name: '',
    category: '',
    condition: 'Good',
    listingType: 'Sale',
    pricingModel: 'fixed',
    price: '',
    startingBid: '',
    minIncrement: '50',
    auctionDurationHours: '48',
    exchangeFor: '',
    rentalPeriod: '',
    description: '',
    image: ''
  };

  if (editingProductId) {
    try {
      const data = await api.get(`/products/${editingProductId}`);
      draft = { ...draft, ...data.product };
    } catch (e) {
      editingProductId = null;
    }
  }

  const isEditing = !!editingProductId;

  return `
  <div class="page-head">
    <div>
      <h2 class="page-title">${isEditing ? 'Edit Listing' : 'Post an Item or Start an Auction'}</h2>
      <p class="page-sub">Share textbooks, equipment, notes, or initiate a campus-wide auction.</p>
    </div>
  </div>

  <div class="card">
    <form data-form="sell" novalidate>
      <div class="form-grid">
        <label class="field span-2">
          <span class="field-label">Listing Title *</span>
          <input type="text" id="sellName" value="${esc(draft.name)}" placeholder="e.g. Casio Scientific Calculator FX-991ES Plus">
        </label>

        <label class="field">
          <span class="field-label">Category *</span>
          <select id="sellCategory">
            <option value="">Select Category</option>
            ${SAMPLE_CATEGORIES.map(cat => `
              <option value="${esc(cat)}" ${draft.category === cat ? 'selected' : ''}>${esc(cat)}</option>
            `).join('')}
          </select>
        </label>

        <label class="field">
          <span class="field-label">Condition *</span>
          <select id="sellCondition">
            ${SAMPLE_CONDITIONS.map(c => `
              <option value="${esc(c)}" ${draft.condition === c ? 'selected' : ''}>${esc(c)}</option>
            `).join('')}
          </select>
        </label>

        <label class="field span-2">
          <span class="field-label">Listing Type *</span>
          <div class="radio-cards">
            <label class="radio-card-label">
              <input type="radio" name="listingType" value="Sale" ${draft.listingType === 'Sale' ? 'checked' : ''} data-input="listing-type-radio">
              <span>💰 Sale</span>
            </label>
            <label class="radio-card-label">
              <input type="radio" name="listingType" value="Rent" ${draft.listingType === 'Rent' ? 'checked' : ''} data-input="listing-type-radio">
              <span>🔄 Rent</span>
            </label>
            <label class="radio-card-label">
              <input type="radio" name="listingType" value="Exchange" ${draft.listingType === 'Exchange' ? 'checked' : ''} data-input="listing-type-radio">
              <span>🔀 Exchange</span>
            </label>
            <label class="radio-card-label">
              <input type="radio" name="listingType" value="Donation" ${draft.listingType === 'Donation' ? 'checked' : ''} data-input="listing-type-radio">
              <span>🎁 Free Donation</span>
            </label>
          </div>
        </label>

        <!-- Pricing Model Selector (Sale only) -->
        <div class="field span-2" id="pricingModelGroup" style="${draft.listingType === 'Sale' ? '' : 'display:none;'}">
          <span class="field-label">Sale Pricing Model *</span>
          <div class="radio-cards">
            <label class="radio-card-label">
              <input type="radio" name="pricingModel" value="fixed" ${draft.pricingModel !== 'bidding' ? 'checked' : ''} data-input="pricing-model-radio">
              <span>🏷️ Fixed Price</span>
            </label>
            <label class="radio-card-label">
              <input type="radio" name="pricingModel" value="bidding" ${draft.pricingModel === 'bidding' ? 'checked' : ''} data-input="pricing-model-radio">
              <span>⚡ Product Auction / Bidding</span>
            </label>
          </div>
        </div>

        <!-- Fixed Price Field -->
        <label class="field" id="fixedPriceGroup" style="${draft.listingType === 'Sale' && draft.pricingModel !== 'bidding' ? '' : 'display:none;'}">
          <span class="field-label">Fixed Price (₹) *</span>
          <input type="number" id="sellPrice" min="1" step="1" value="${esc(draft.price)}" placeholder="e.g. 450">
        </label>

        <!-- Rent Period Field -->
        <label class="field" id="rentPeriodGroup" style="${draft.listingType === 'Rent' ? '' : 'display:none;'}">
          <span class="field-label">Rental Terms &amp; Rate (₹)</span>
          <input type="text" id="sellRentalPeriod" value="${esc(draft.rentalPeriod)}" placeholder="e.g. ₹150 for 1 semester">
        </label>

        <!-- Exchange Details Field -->
        <label class="field span-2" id="exchangeGroup" style="${draft.listingType === 'Exchange' ? '' : 'display:none;'}">
          <span class="field-label">Looking to Exchange For *</span>
          <input type="text" id="sellExchangeFor" value="${esc(draft.exchangeFor)}" placeholder="e.g. Computer Networks by Tanenbaum or Engineering Graphics kit">
        </label>

        <!-- Bidding Configuration Fields -->
        <div class="span-2 form-grid" id="biddingConfigGroup" style="${draft.listingType === 'Sale' && draft.pricingModel === 'bidding' ? '' : 'display:none;'}">
          <label class="field">
            <span class="field-label">Starting Bid Price (₹) *</span>
            <input type="number" id="sellStartingBid" min="1" step="1" value="${esc(draft.startingBid || draft.price)}" placeholder="e.g. 300">
            <span class="field-hint">Initial floor price for the first bidder.</span>
          </label>

          <label class="field">
            <span class="field-label">Minimum Bid Increment (₹) *</span>
            <input type="number" id="sellMinIncrement" min="5" step="5" value="${esc(draft.minIncrement || 50)}" placeholder="e.g. 50">
            <span class="field-hint">Minimum additional amount above highest bid.</span>
          </label>

          <label class="field span-2">
            <span class="field-label">Auction Duration *</span>
            <select id="sellAuctionDuration">
              <option value="24" ${draft.auctionDurationHours === '24' ? 'selected' : ''}>24 Hours (1 Day)</option>
              <option value="48" ${draft.auctionDurationHours === '48' || !draft.auctionDurationHours ? 'selected' : ''}>48 Hours (2 Days)</option>
              <option value="72" ${draft.auctionDurationHours === '72' ? 'selected' : ''}>72 Hours (3 Days)</option>
              <option value="168" ${draft.auctionDurationHours === '168' ? 'selected' : ''}>7 Days (1 Week)</option>
            </select>
          </label>
        </div>

        <!-- Image Upload & URL -->
        <label class="field">
          <span class="field-label">Upload Product Image</span>
          <input type="file" id="sellImageFile" accept="image/*">
          <span class="field-hint">Supports JPEG, PNG, WebP up to 5 MB.</span>
        </label>

        <label class="field">
          <span class="field-label">Or Image URL (Online Photo)</span>
          <input type="url" id="sellImage" data-input="image-preview" value="${esc(draft.image)}" placeholder="https://images.unsplash.com/...">
        </label>

        <label class="field span-2">
          <span class="field-label">Description *</span>
          <textarea id="sellDescription" placeholder="Mention syllabus, edition, physical condition, solved question papers, or bundled accessories.">${esc(draft.description)}</textarea>
        </label>
      </div>

      <!-- Live Image Preview -->
      <div class="seller-box">
        <div class="list-row-thumb" id="imagePreviewBox">
          ${draft.image ? `<img src="${esc(draft.image)}" alt="Preview">` : '<div class="img-fallback">🖼️</div>'}
        </div>
        <div>
          <div><strong>Live Image Preview</strong></div>
          <div class="small muted">Updates automatically when uploading a file or entering an image URL.</div>
        </div>
      </div>

      <p class="form-error hidden" id="sellError"></p>

      <div class="form-actions">
        <button type="submit" class="btn btn-primary" id="sellSubmitBtn">
          ${isEditing ? '💾 Save Changes' : '➕ Post Listing / Auction'}
        </button>
        <button type="button" class="btn btn-ghost" data-action="cancel-sell">Cancel</button>
      </div>
    </form>
  </div>`;
}

/* ==========================================================
   13. VIEW: MY LISTINGS & AUCTIONS
   ========================================================== */

async function buildListingsView() {
  const [prodData, reqData] = await Promise.all([
    api.get(`/products?seller=${encodeURIComponent(currentUser.email)}&status=all`),
    api.get('/requests?type=received')
  ]);

  const mine = prodData.products || [];
  const receivedReqs = reqData.requests || [];

  const header = `
  <div class="page-head">
    <div>
      <h2 class="page-title">My Listings &amp; Auctions</h2>
      <p class="page-sub">Manage your products, live bids, status and transactions.</p>
    </div>
    <button type="button" class="btn btn-primary" data-view="sell">➕ Post Listing</button>
  </div>`;

  if (!mine.length) {
    return header + emptyState('🏷️', 'You have no listings posted yet',
      'Post your textbooks, notes or start an auction for other campus members to see.',
      '<button type="button" class="btn btn-primary" data-view="sell">Post your first item</button>');
  }

  const rows = mine.map(p => {
    const isAuction = p.pricingModel === 'bidding';
    const isSold = ['sold', 'exchanged', 'rented', 'donated'].includes(p.status);
    const relatedReqs = receivedReqs.filter(r => String(r.productId) === String(p.id || p._id));

    let priceInfo = money(p.price);
    if (isAuction) {
      priceInfo = p.bidsCount > 0 ? `Current Bid: ${money(p.currentHighestBid)} (${p.bidsCount} bids)` : `Starting Bid: ${money(p.startingBid)}`;
    }

    return `
    <div class="list-row">
      <div class="list-row-thumb">
        ${p.image ? `<img src="${esc(p.image)}" alt="${esc(p.name)}">` : '<div class="img-fallback">🖼️</div>'}
      </div>
      <div class="list-row-main">
        <p class="list-row-title">${esc(p.name)}</p>
        <div class="list-row-sub">
          ${priceInfo} · ${esc(p.category)} · ${esc(p.condition)} · ${relatedReqs.length} request(s)
        </div>
        <div class="mt-1">
          <span class="pill ${isSold ? 'pill-sold' : 'pill-available'}">${isSold ? 'Sold / Done' : 'Available'}</span>
          ${isAuction ? `<span class="pill pill-bidding">🔨 Auction (${p.auctionStatus})</span>` : ''}
        </div>
      </div>
      <div class="list-row-actions">
        <button type="button" class="btn btn-ghost btn-sm" data-action="open-product" data-id="${esc(p.id || p._id)}">View</button>
        <button type="button" class="btn btn-soft btn-sm" data-action="edit-listing" data-id="${esc(p.id || p._id)}">✏️ Edit</button>
        ${!isSold ? `
          <button type="button" class="btn btn-success-soft btn-sm" data-action="mark-sold" data-id="${esc(p.id || p._id)}">✔ Mark Sold</button>
        ` : `
          <button type="button" class="btn btn-ghost btn-sm" data-action="mark-available" data-id="${esc(p.id || p._id)}">Mark Available</button>
        `}
        <button type="button" class="btn btn-danger-soft btn-sm" data-action="delete-listing" data-id="${esc(p.id || p._id)}">🗑️ Delete</button>
      </div>
    </div>`;
  }).join('');

  return header + `
  <div class="stat-grid mt-2">
    <div class="stat-card accent">
      <div class="stat-value">${mine.length}</div>
      <div class="stat-label">Your Listings</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${mine.filter(p => p.status === 'available').length}</div>
      <div class="stat-label">Still Available</div>
    </div>
    <div class="stat-card" style="background:#fffbeb;">
      <div class="stat-value" style="color:#b45309;">${mine.filter(p => p.pricingModel === 'bidding').length}</div>
      <div class="stat-label">Auctions</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${receivedReqs.length}</div>
      <div class="stat-label">Requests Received</div>
    </div>
  </div>
  <div class="list-stack mt-2">${rows}</div>`;
}

/* ==========================================================
   14. VIEW: CHATS (Persistent Peer-to-Peer Messaging)
   ========================================================== */

async function buildChatsView() {
  const data = await api.get('/conversations');
  const conversations = data.conversations || [];

  const header = `
  <div class="page-head">
    <div>
      <h2 class="page-title">My Campus Chats</h2>
      <p class="page-sub">Direct communication between verified buyers and sellers.</p>
    </div>
  </div>`;

  if (!conversations.length) {
    return header + emptyState('💬', 'No conversations yet',
      'Open any listing and select "Chat with Seller" to start a conversation.',
      '<button type="button" class="btn btn-primary" data-view="browse">Browse Marketplace</button>');
  }

  let active = conversations.find(c => String(c.id || c._id) === String(activeConversationId));
  if (!active) {
    active = conversations[0];
    activeConversationId = active.id || active._id;
  }

  const sidebarHtml = conversations.map(c => {
    const cid = c.id || c._id;
    const lastMsg = c.messages && c.messages.length ? c.messages[c.messages.length - 1] : null;
    const isAct = String(cid) === String(activeConversationId);
    return `
    <button type="button" class="conv-item ${isAct ? 'active' : ''}" data-action="open-conversation" data-id="${esc(cid)}">
      <div class="conv-name">${esc(c.otherUser?.name || 'Campus Member')}</div>
      <div class="conv-product">${esc(c.product?.name || 'Direct Chat')}</div>
      <div class="conv-preview">${esc(lastMsg ? (lastMsg.from === currentUser.email ? 'You: ' : '') + lastMsg.text : 'No messages yet')}</div>
    </button>`;
  }).join('');

  const bubblesHtml = (active.messages || []).length > 0 ? (active.messages || []).map(m => {
    const mine = m.from === currentUser.email;
    return `
    <div class="msg ${mine ? 'msg-me' : 'msg-them'}">
      ${esc(m.text)}
      <span class="msg-time">${esc(m.time || '')} ${mine ? '· you' : ''}</span>
    </div>`;
  }).join('') : '<p class="muted small center">No messages in this chat yet. Say hello 👋</p>';

  return header + `
  <div class="chat-layout">
    <div class="chat-sidebar">
      <div class="chat-sidebar-head">Conversations (${conversations.length})</div>
      ${sidebarHtml}
    </div>
    <div class="chat-panel">
      <div class="chat-head">
        <div>
          <div class="chat-head-title">${esc(active.otherUser?.name || 'Campus Member')}</div>
          <div class="small muted">${active.product ? `Regarding: ${esc(active.product.name)}` : 'General inquiry'}</div>
        </div>
        <div class="row-actions">
          ${active.productId ? `
            <button type="button" class="btn btn-ghost btn-sm" data-action="open-product" data-id="${esc(active.productId)}">View Listing</button>
          ` : ''}
          <button type="button" class="btn btn-warn-soft btn-sm" data-action="report-user" data-id="${esc(active.otherUser?.email)}">🚩 Report</button>
        </div>
      </div>
      <div class="chat-body" id="chatBody">
        ${bubblesHtml}
      </div>
      <form class="chat-input" data-form="chat" data-id="${esc(active.id || active._id)}">
        <input type="text" id="chatInput" placeholder="Type your message here..." autocomplete="off">
        <button type="submit" class="btn btn-primary">Send</button>
      </form>
    </div>
  </div>`;
}

async function refreshActiveChat() {
  if (currentView !== 'chats' || !activeConversationId) return;
  try {
    const data = await api.get(`/conversations/${activeConversationId}`);
    const conv = data.conversation;
    const body = $('chatBody');
    if (!body || !conv) return;

    const bubblesHtml = (conv.messages || []).map(m => {
      const mine = m.from === currentUser.email;
      return `<div class="msg ${mine ? 'msg-me' : 'msg-them'}">
        ${esc(m.text)}
        <span class="msg-time">${esc(m.time || '')} ${mine ? '· you' : ''}</span>
      </div>`;
    }).join('');

    body.innerHTML = bubblesHtml;
  } catch (e) { /* ignore periodic poll errors */ }
}

function scrollChatToBottom() {
  const body = $('chatBody');
  if (body) body.scrollTop = body.scrollHeight;
}

/* ==========================================================
   15. VIEW: PURCHASE REQUESTS & REVIEWS
   ========================================================== */

function statusPill(status) {
  const s = String(status || 'Pending').toLowerCase();
  return `<span class="pill pill-${s}">${esc(status)}</span>`;
}

async function buildRequestsView() {
  const data = await api.get('/requests?type=' + requestTab);
  const list = data.requests || [];

  const [sentCountData, recCountData] = await Promise.all([
    api.get('/requests?type=sent'),
    api.get('/requests?type=received')
  ]);

  const sentCount = (sentCountData.requests || []).length;
  const receivedCount = (recCountData.requests || []).length;

  const header = `
  <div class="page-head">
    <div>
      <h2 class="page-title">Purchase &amp; Exchange Requests</h2>
      <p class="page-sub">Track incoming offers, manage transactions, and rate partners after completion.</p>
    </div>
    <button type="button" class="btn btn-ghost" data-view="browse">Browse Items</button>
  </div>

  <div class="tabs">
    <button type="button" class="tab ${requestTab === 'sent' ? 'active' : ''}" data-action="request-tab" data-id="sent">
      Sent Requests (${sentCount})
    </button>
    <button type="button" class="tab ${requestTab === 'received' ? 'active' : ''}" data-action="request-tab" data-id="received">
      Received Requests (${receivedCount})
    </button>
  </div>`;

  if (!list.length) {
    return header + emptyState('📦',
      requestTab === 'sent' ? 'No requests sent' : 'No requests received',
      requestTab === 'sent'
        ? 'Find a textbook or item on the marketplace and send a purchase request to the seller.'
        : 'When someone sends an offer for your listings or wins your auction, it will show up here.',
      '<button type="button" class="btn btn-primary" data-view="browse">Browse Marketplace</button>');
  }

  const rows = list.map(r => {
    const isBuyer = r.buyerEmail === currentUser.email;
    const isSeller = r.sellerEmail === currentUser.email;
    const actions = [];

    if (isBuyer && r.status === 'Pending') {
      actions.push(`<button type="button" class="btn btn-danger-soft btn-sm" data-action="cancel-request" data-id="${esc(r.id || r._id)}">Cancel</button>`);
    }
    if (isSeller && r.status === 'Pending') {
      actions.push(`<button type="button" class="btn btn-success-soft btn-sm" data-action="accept-request" data-id="${esc(r.id || r._id)}">Accept Offer</button>`);
      actions.push(`<button type="button" class="btn btn-danger-soft btn-sm" data-action="reject-request" data-id="${esc(r.id || r._id)}">Reject</button>`);
    }
    if (r.status === 'Accepted') {
      actions.push(`<button type="button" class="btn btn-primary btn-sm" data-action="complete-request" data-id="${esc(r.id || r._id)}">✔ Mark Completed</button>`);
    }
    if (r.status === 'Completed') {
      actions.push(`<button type="button" class="btn btn-gold btn-sm" data-action="open-review-modal" data-id="${esc(r.id || r._id)}">⭐ Rate &amp; Review</button>`);
    }

    return `
    <div class="list-row">
      <div class="list-row-thumb">
        ${r.product?.image ? `<img src="${esc(r.product.image)}" alt="${esc(r.productName)}">` : '<div class="img-fallback">📦</div>'}
      </div>
      <div class="list-row-main">
        <p class="list-row-title">${esc(r.productName || 'Listing')}</p>
        <div class="list-row-sub">
          Offered: <strong>${money(r.offeredPrice)}</strong> · Buyer: ${esc(r.buyerName)} · Seller: ${esc(r.sellerName)}
        </div>
        ${r.note ? `<div class="list-row-sub muted">"${esc(r.note)}"</div>` : ''}
        <div class="list-row-sub">Date: ${esc(r.date)} · Type: <span class="pill pill-xs">${esc(r.requestType)}</span></div>
        <div class="mt-1">${statusPill(r.status)}</div>
      </div>
      <div class="list-row-actions">
        ${r.productId ? `<button type="button" class="btn btn-ghost btn-sm" data-action="open-product" data-id="${esc(r.productId)}">View Item</button>` : ''}
        ${actions.join('')}
      </div>
    </div>`;
  }).join('');

  return header + `<div class="list-stack mt-2">${rows}</div>`;
}

/* ==========================================================
   16. VIEW: WISHLIST
   ========================================================== */

async function buildWishlistView() {
  const data = await api.get('/wishlist');
  const items = data.wishlist || [];

  const header = `
  <div class="page-head">
    <div>
      <h2 class="page-title">My Wishlist</h2>
      <p class="page-sub">Bookmarked items to track price or purchase later.</p>
    </div>
    <button type="button" class="btn btn-ghost" data-view="browse">Browse More</button>
  </div>`;

  if (!items.length) {
    return header + emptyState('❤️', 'Your wishlist is empty',
      'Click the wishlist button on any product card or auction to save it here.',
      '<button type="button" class="btn btn-primary" data-view="browse">Discover Items</button>');
  }

  const rows = items.map(p => `
    <div class="list-row">
      <div class="list-row-thumb">
        ${p.image ? `<img src="${esc(p.image)}" alt="${esc(p.name)}">` : '<div class="img-fallback">🖼️</div>'}
      </div>
      <div class="list-row-main">
        <p class="list-row-title">${esc(p.name)}</p>
        <div class="list-row-sub">${money(p.price)} · ${esc(p.category)} · Seller: ${esc(p.sellerName || p.sellerEmail)}</div>
        <div class="mt-1"><span class="pill ${p.status === 'available' ? 'pill-available' : 'pill-sold'}">${esc(p.status)}</span></div>
      </div>
      <div class="list-row-actions">
        <button type="button" class="btn btn-primary btn-sm" data-action="open-product" data-id="${esc(p.id || p._id)}">View Details</button>
        <button type="button" class="btn btn-danger-soft btn-sm" data-action="toggle-wishlist" data-id="${esc(p.id || p._id)}">Remove</button>
      </div>
    </div>
  `).join('');

  return header + `<div class="list-stack">${rows}</div>`;
}

/* ==========================================================
   17. VIEW: PROFILE & USER REVIEWS
   ========================================================== */

async function buildProfileView() {
  const [meData, reviewsData, myBidsData] = await Promise.all([
    api.get('/auth/me'),
    api.get(`/reviews/user/${encodeURIComponent(currentUser.email)}`),
    api.get('/bids/my-bids')
  ]);

  const user = meData.user;
  currentUser = { ...currentUser, ...user };
  localStorage.setItem(USER_KEY, JSON.stringify(currentUser));

  const reviews = reviewsData.reviews || [];
  const myBids = myBidsData.bids || [];

  return `
  <div class="page-head">
    <div>
      <h2 class="page-title">My Institute Profile</h2>
      <p class="page-sub">Verified campus membership, active bids and trust rating.</p>
    </div>
  </div>

  <div class="card">
    <div class="seller-box" style="background:#f7f9ff">
      <span class="avatar lg">${initials(user.name)}</span>
      <div>
        <h3 class="card-title">${esc(user.name)}</h3>
        <div class="small muted">${esc(user.email)} · ${esc(user.department)} · ${esc(user.year)}</div>
        <div class="mt-1" style="display:flex;gap:8px;align-items:center;">
          <span class="pill ${user.role === 'admin' ? 'pill-under-review' : 'pill-active'}">
            ${user.role === 'admin' ? '🛡️ Campus Administrator' : (user.role === 'staff' ? '👨‍🏫 Faculty / Staff' : '🎓 Verified Student')}
          </span>
          <span class="star-rating">★ ${user.rating || 5.0} / 5.0 (${user.ratingsCount || 0} reviews)</span>
        </div>
      </div>
    </div>

    <h3 class="section-title">Edit Profile Information</h3>
    <form data-form="profile" novalidate>
      <div class="form-grid">
        <label class="field">
          <span class="field-label">Full Name</span>
          <input type="text" id="profileName" value="${esc(user.name)}">
        </label>
        <label class="field">
          <span class="field-label">Institute Email (Domain Locked)</span>
          <input type="text" value="${esc(user.email)}" disabled>
        </label>
        <label class="field">
          <span class="field-label">Department</span>
          <input type="text" id="profileDepartment" value="${esc(user.department)}">
        </label>
        <label class="field">
          <span class="field-label">Year of Study / Designation</span>
          <input type="text" id="profileYear" value="${esc(user.year)}">
        </label>
      </div>

      <p class="form-error hidden" id="profileError"></p>

      <div class="form-actions">
        <button type="submit" class="btn btn-primary">💾 Save Profile</button>
        <button type="button" class="btn btn-ghost" data-view="listings">🏷️ My Listings (${user.listingsCount || 0})</button>
        <button type="button" class="btn btn-ghost" data-view="requests">📦 Requests (${user.requestsCount || 0})</button>
        <button type="button" class="btn btn-danger" data-action="logout">⎋ Logout</button>
      </div>
    </form>
  </div>

  <!-- MY BIDDING PARTICIPATION HISTORY -->
  <h3 class="section-title">My Auction Bidding History</h3>
  <div class="card">
    ${myBids.length > 0 ? `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Auction Item</th>
              <th>My Bid</th>
              <th>Status</th>
              <th>Date Placed</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${myBids.map(b => `
              <tr>
                <td><strong>${esc(b.listingName || b.product?.name || 'Auction Item')}</strong></td>
                <td><strong>${money(b.amount)}</strong></td>
                <td>
                  ${b.isWinning
                    ? '<span class="pill pill-available">🏆 Winning Bid</span>'
                    : '<span class="pill pill-pending">Outbid / Active</span>'}
                </td>
                <td>${new Date(b.createdAt).toLocaleDateString('en-GB')}</td>
                <td>
                  <button type="button" class="btn btn-ghost btn-xs" data-action="open-product" data-id="${esc(b.listingId)}">View Auction</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : '<p class="muted small">You haven\'t placed bids on any auctions yet. Check out the active auctions on the marketplace!</p>'}
  </div>

  <!-- REVIEWS RECEIVED -->
  <h3 class="section-title">Feedback &amp; Reviews Received (${reviews.length})</h3>
  <div class="card">
    ${reviews.length > 0 ? reviews.map(r => `
      <div class="review-card">
        <div class="review-header">
          <span class="review-author">${esc(r.reviewerName)}</span>
          <span class="review-stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span>
        </div>
        <div class="review-comment">${esc(r.comment)}</div>
        <div class="review-date">${esc(r.date)} · Transaction for "${esc(r.productName)}"</div>
      </div>
    `).join('') : '<p class="muted small">No reviews received yet. Reviews are awarded after completing purchase requests.</p>'}
  </div>`;
}

/* ==========================================================
   18. VIEW: NOTIFICATIONS
   ========================================================== */

const NOTIF_ICONS = {
  request: '📦',
  message: '💬',
  sold: '✔',
  report: '🚩',
  bid: '📈',
  auction_win: '🎉',
  outbid: '⚠️',
  review: '⭐',
  general: '🔔'
};

async function buildNotificationsView() {
  const data = await api.get('/notifications');
  const list = data.notifications || [];
  const unread = list.filter(n => !n.read).length;

  const header = `
  <div class="page-head">
    <div>
      <h2 class="page-title">Notifications</h2>
      <p class="page-sub">${unread} unread of ${list.length} total messages.</p>
    </div>
    ${list.length ? `<button type="button" class="btn btn-ghost" data-action="mark-all-read">Mark all as read</button>` : ''}
  </div>`;

  if (!list.length) {
    return header + emptyState('🔔', 'No notifications yet',
      'Updates regarding purchase requests, auction bids, outbids and chat will appear here.',
      '<button type="button" class="btn btn-primary" data-view="browse">Browse Marketplace</button>');
  }

  const items = list.map(n => `
    <button type="button" class="notif ${n.read ? '' : 'unread'}" data-action="open-notification" data-id="${esc(n.id || n._id)}" data-link="${esc(n.link || 'home')}">
      <span class="notif-icon" aria-hidden="true">${NOTIF_ICONS[n.type] || '🔔'}</span>
      <span style="flex:1;min-width:0">
        <span class="notif-title">${esc(n.title)}</span>
        <span class="notif-msg">${esc(n.message)}</span>
        <span class="notif-time">${esc(n.time)}</span>
      </span>
      ${n.read ? '' : '<span class="notif-dot" aria-hidden="true"></span>'}
    </button>
  `).join('');

  return header + `<div class="notif-list">${items}</div>`;
}

/* ==========================================================
   19. VIEW: REPORTS
   ========================================================== */

async function buildReportView(params) {
  let reportType = 'Product';
  let targetId = '';
  if (params && params.includes(':')) {
    const parts = params.split(':');
    reportType = parts[0] === 'user' ? 'User' : 'Product';
    targetId = parts.slice(1).join(':');
  }

  const [prodData, myReportsData] = await Promise.all([
    api.get('/products?status=all'),
    api.get('/reports')
  ]);

  const products = prodData.products || [];
  const myReports = myReportsData.reports || [];

  return `
  <div class="page-head">
    <div>
      <h2 class="page-title">Report a Listing or User</h2>
      <p class="page-sub">Help maintain campus integrity. Reports are promptly reviewed by administrators.</p>
    </div>
  </div>

  <div class="card">
    <form data-form="report" novalidate>
      <div class="form-grid">
        <label class="field">
          <span class="field-label">Report Type *</span>
          <select id="reportType" data-input="report-type">
            <option value="Product" ${reportType === 'Product' ? 'selected' : ''}>Product Listing</option>
            <option value="User" ${reportType === 'User' ? 'selected' : ''}>Campus User / Student</option>
          </select>
        </label>

        <label class="field ${reportType === 'User' ? 'hidden' : ''}" id="reportTargetProductField">
          <span class="field-label">Select Listing *</span>
          <select id="reportProduct">
            ${products.map(p => `
              <option value="${esc(p.id || p._id)}" ${targetId === (p.id || p._id) ? 'selected' : ''}>
                ${esc(p.name)} (${money(p.price)})
              </option>
            `).join('')}
          </select>
        </label>

        <label class="field ${reportType === 'Product' ? 'hidden' : ''}" id="reportTargetUserField">
          <span class="field-label">User Email to Report *</span>
          <input type="email" id="reportUserEmail" value="${reportType === 'User' ? esc(targetId) : ''}" placeholder="student@demo.edu">
        </label>

        <label class="field">
          <span class="field-label">Reason *</span>
          <select id="reportReason">
            <option value="">Select a reason</option>
            ${SAMPLE_REPORT_REASONS.map(r => `<option value="${esc(r)}">${esc(r)}</option>`).join('')}
          </select>
        </label>

        <label class="field span-2">
          <span class="field-label">Explanation / Evidence *</span>
          <textarea id="reportDescription" placeholder="Please specify details to aid campus moderation."></textarea>
        </label>
      </div>

      <p class="form-error hidden" id="reportError"></p>

      <div class="form-actions">
        <button type="submit" class="btn btn-primary">🚩 Submit Report</button>
        <button type="button" class="btn btn-ghost" data-action="cancel-report">Cancel</button>
      </div>
    </form>
  </div>

  <h3 class="section-title">My Submitted Reports</h3>
  <div class="card">
    ${myReports.length > 0 ? `
      <div class="list-stack">
        ${myReports.map(r => `
          <div class="list-row">
            <div class="list-row-main">
              <p class="list-row-title">${esc(r.type)}: ${esc(r.targetLabel)}</p>
              <div class="list-row-sub">Reason: ${esc(r.reason)} · ${esc(r.description)}</div>
              <div class="list-row-sub">Date: ${esc(r.date)}</div>
            </div>
            <div>${statusPill(r.status)}</div>
          </div>
        `).join('')}
      </div>
    ` : '<p class="muted small">You haven\'t submitted any reports.</p>'}
  </div>`;
}

/* ==========================================================
   20. VIEW: TECHNICAL ARCHITECTURE
   ========================================================== */

function buildTechView() {
  const stack = [
    ['Backend Framework', 'Node.js & Express.js architecture with clean MVC separation (controllers, routes, services, middleware).'],
    ['Database & ORM', 'MongoDB with Mongoose schemas, indexes, and validation. Includes embedded JSON persistence fallback for zero-setup execution.'],
    ['Authentication', 'Stateless JWT (JSON Web Tokens) with bcrypt password hashing (10 salt rounds). Email domain validation (@demo.edu).'],
    ['Role Authorization', 'Granular Role-Based Access Control (RBAC) supporting Students, Staff/Faculty, and Administrators.'],
    ['Bidding / Auction Engine', 'Atomic bid transactions, server-side minimum increment validation, race-condition mitigation, and auto-finalizing scheduler.'],
    ['Transaction Safety', 'Conflict-free purchase request locking: accepting an offer automatically reserves the listing and cancels competing requests.'],
    ['Rating & Review Protection', 'Cryptographically verified transaction pairing: reviews are strictly limited to buyers/sellers of Completed orders.'],
    ['Media Uploads', 'Multer image processing with MIME-type verification, file size guardrails (5MB), and static hosting under /uploads.']
  ];

  return `
  <div class="page-head">
    <div>
      <h2 class="page-title">Technical Architecture &amp; System Design</h2>
      <p class="page-sub">Project engineering overview for college Problem-Based Learning evaluation.</p>
    </div>
    <button type="button" class="btn btn-ghost" data-action="reset-demo">🔄 Reset Demo Database</button>
  </div>

  <div class="table-wrap">
    <table>
      <thead><tr><th style="width:220px">Subsystem</th><th>Engineering Implementation</th></tr></thead>
      <tbody>
        ${stack.map(row => `
          <tr><td><strong>${esc(row[0])}</strong></td><td>${esc(row[1])}</td></tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <h3 class="section-title">New Feature: Product Bidding / Auction System</h3>
  <div class="card">
    <p class="muted">
      The auction engine enables sellers to list items with a <strong>starting bid</strong>, a <strong>minimum increment</strong>, and an <strong>expiration deadline</strong>.
      Bids are evaluated atomically on the server. If two users bid simultaneously, only the valid higher bid succeeds.
      When the deadline expires, the automated background worker identifies the winner, dispatches notifications, and generates an accepted transaction record.
    </p>
  </div>`;
}

/* ==========================================================
   21. ADMIN DASHBOARD CONTROLLER
   ========================================================== */

const ADMIN_VIEW_IDS = {
  overview: 'admin-overview',
  users: 'admin-users',
  listings: 'admin-listings',
  reports: 'admin-reports',
  activity: 'admin-activity'
};

async function renderAdmin() {
  Object.keys(ADMIN_VIEW_IDS).forEach(k => {
    const s = $(ADMIN_VIEW_IDS[k]);
    if (s) s.classList.add('hidden');
  });

  const target = $(ADMIN_VIEW_IDS[adminSection]) || $(ADMIN_VIEW_IDS.overview);
  target.classList.remove('hidden');
  target.innerHTML = '<div class="center" style="padding:30px;"><span class="pill">Loading moderation data...</span></div>';

  $$('.admin-nav-item').forEach(b => {
    b.classList.toggle('active', b.dataset.admin === adminSection);
  });

  try {
    let html = '';
    if (adminSection === 'users') html = await adminUsersHtml();
    else if (adminSection === 'listings') html = await adminListingsHtml();
    else if (adminSection === 'reports') html = await adminReportsHtml();
    else if (adminSection === 'activity') html = await adminActivityHtml();
    else html = await adminOverviewHtml();

    target.innerHTML = html;
  } catch (err) {
    target.innerHTML = emptyState('⚠️', 'Admin error', err.message);
  }
}

async function adminOverviewHtml() {
  const [statsData, actData, repData] = await Promise.all([
    api.get('/admin/stats'),
    api.get('/admin/activity'),
    api.get('/reports')
  ]);

  const stats = statsData.stats;
  const activity = actData.activity || [];
  const reports = repData.reports || [];

  return `
  <div class="stat-grid">
    <div class="stat-card accent"><div class="stat-value">${stats.totalUsers}</div><div class="stat-label">Total Users</div></div>
    <div class="stat-card"><div class="stat-value">${stats.activeListings}</div><div class="stat-label">Active Listings</div></div>
    <div class="stat-card" style="background:#fffbeb;"><div class="stat-value" style="color:#b45309;">${stats.activeAuctions}</div><div class="stat-label">Active Auctions</div></div>
    <div class="stat-card"><div class="stat-value">${stats.totalBids}</div><div class="stat-label">Total Bids Placed</div></div>
    <div class="stat-card"><div class="stat-value">${stats.pendingReports}</div><div class="stat-label">Pending Reports</div></div>
  </div>

  <div class="admin-grid mt-3">
    <div class="card">
      <h3 class="card-title">Pending Moderation Reports</h3>
      ${reports.slice(0, 4).map(r => `
        <div class="activity-item">
          <span class="activity-icon">🚩</span>
          <div>
            <div class="activity-text">${esc(r.type)}: ${esc(r.targetLabel)}</div>
            <div class="activity-time">${esc(r.reason)} · by ${esc(r.reporterEmail)}</div>
          </div>
          <div style="margin-left:auto">${statusPill(r.status)}</div>
        </div>
      `).join('')}
      <button type="button" class="btn btn-soft mt-2" data-admin-go="reports">Manage All Reports</button>
    </div>

    <div class="card">
      <h3 class="card-title">Live Platform Activity Stream</h3>
      ${activity.slice(0, 6).map(a => `
        <div class="activity-item">
          <span class="activity-icon">🕒</span>
          <div>
            <div class="activity-text">${esc(a.text)}</div>
            <div class="activity-time">${esc(a.time)}</div>
          </div>
        </div>
      `).join('')}
    </div>
  </div>`;
}

async function adminUsersHtml() {
  const data = await api.get('/admin/users');
  const users = data.users || [];

  const rows = users.map(u => {
    const isSelf = u.email === currentUser.email;
    const suspended = u.status === 'suspended';
    return `
    <tr>
      <td>
        <div style="display:flex;gap:8px;align-items:center;">
          <span class="avatar">${initials(u.name)}</span>
          <div><strong>${esc(u.name)}</strong><div class="small muted">${esc(u.year || 'Member')}</div></div>
        </div>
      </td>
      <td>${esc(u.email)}</td>
      <td><span class="pill pill-cat">${esc(u.role)}</span></td>
      <td>${esc(u.department)}</td>
      <td><span class="pill ${suspended ? 'pill-suspended' : 'pill-active'}">${esc(u.status)}</span></td>
      <td>
        ${isSelf ? '<span class="small muted">Current Account</span>' : `
          <button type="button" class="btn ${suspended ? 'btn-success-soft' : 'btn-danger-soft'} btn-xs" data-admin-action="toggle-user" data-id="${esc(u.email)}">
            ${suspended ? 'Reactivate' : 'Suspend'}
          </button>
        `}
      </td>
    </tr>`;
  }).join('');

  return `
  <div class="card">
    <h3 class="card-title">Registered Institute Members (${users.length})</h3>
    <div class="table-wrap mt-2">
      <table>
        <thead><tr><th>Member</th><th>Email</th><th>Role</th><th>Department</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>`;
}

async function adminListingsHtml() {
  const data = await api.get('/products?status=all');
  let products = data.products || [];

  if (adminListingQuery.trim()) {
    const q = adminListingQuery.trim().toLowerCase();
    products = products.filter(p => `${p.name} ${p.category} ${p.sellerEmail}`.toLowerCase().includes(q));
  }

  const rows = products.map(p => `
    <tr>
      <td>
        <div style="display:flex;gap:8px;align-items:center;">
          <span class="list-row-thumb" style="width:40px;height:40px;">
            ${p.image ? `<img src="${esc(p.image)}" alt="">` : '<div class="img-fallback">🖼️</div>'}
          </span>
          <div><strong>${esc(p.name)}</strong><div class="small muted">${esc(p.category)} · ${p.pricingModel === 'bidding' ? '⚡ Auction' : 'Fixed'}</div></div>
        </div>
      </td>
      <td>${money(p.price)}</td>
      <td>${esc(p.sellerEmail)}</td>
      <td><span class="pill ${p.status === 'available' ? 'pill-available' : 'pill-sold'}">${esc(p.status)}</span></td>
      <td>
        <div class="row-actions">
          <button type="button" class="btn btn-ghost btn-xs" data-action="open-product" data-id="${esc(p.id || p._id)}">View</button>
          <button type="button" class="btn btn-danger-soft btn-xs" data-admin-action="remove-product" data-id="${esc(p.id || p._id)}">Remove</button>
        </div>
      </td>
    </tr>
  `).join('');

  return `
  <div class="card">
    <h3 class="card-title">Marketplace Listings &amp; Auctions (${products.length})</h3>
    <div class="table-wrap mt-2">
      <table>
        <thead><tr><th>Product</th><th>Price / Bid</th><th>Seller</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>`;
}

async function adminReportsHtml() {
  const data = await api.get('/reports');
  const reports = data.reports || [];

  const rows = reports.map(r => `
    <tr>
      <td><strong>${esc(r.type)}</strong></td>
      <td>${esc(r.targetLabel)}</td>
      <td>${esc(r.reporterEmail)}</td>
      <td>${esc(r.reason)}<div class="small muted">${esc(r.description)}</div></td>
      <td>${statusPill(r.status)}</td>
      <td>
        <div class="row-actions">
          <button type="button" class="btn btn-warn-soft btn-xs" data-admin-action="report-review" data-id="${esc(r.id || r._id)}">Under Review</button>
          <button type="button" class="btn btn-success-soft btn-xs" data-admin-action="report-resolve" data-id="${esc(r.id || r._id)}">Resolve</button>
        </div>
      </td>
    </tr>
  `).join('');

  return `
  <div class="card">
    <h3 class="card-title">Moderation Reports (${reports.length})</h3>
    <div class="table-wrap mt-2">
      <table>
        <thead><tr><th>Type</th><th>Target</th><th>Reporter</th><th>Reason &amp; Details</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>`;
}

async function adminActivityHtml() {
  const data = await api.get('/admin/activity');
  const items = data.activity || [];

  return `
  <div class="card">
    <h3 class="card-title">Recent System Activities</h3>
    <div class="mt-2">
      ${items.map(a => `
        <div class="activity-item">
          <span class="activity-icon">⚡</span>
          <div>
            <div class="activity-text">${esc(a.text)}</div>
            <div class="activity-time">${esc(a.time)}</div>
          </div>
        </div>
      `).join('')}
    </div>
  </div>`;
}

/* ==========================================================
   22. EVENT DELEGATION & ACTION HANDLERS
   ========================================================== */

function onDocumentClick(event) {
  const navEl = event.target.closest('[data-view]');
  if (navEl) {
    event.preventDefault();
    $('userMenu').classList.add('hidden');
    goToView(navEl.dataset.view);
    return;
  }

  const actionEl = event.target.closest('[data-action]');
  if (actionEl) {
    event.preventDefault();
    handleAction(actionEl.dataset.action, actionEl.dataset.id, actionEl);
    return;
  }

  const adminEl = event.target.closest('[data-admin-action]');
  if (adminEl) {
    event.preventDefault();
    handleAdminAction(adminEl.dataset.adminAction, adminEl.dataset.id);
    return;
  }

  const adminNavEl = event.target.closest('[data-admin]');
  if (adminNavEl) {
    event.preventDefault();
    adminSection = adminNavEl.dataset.admin;
    renderAdmin();
    return;
  }

  const adminGoEl = event.target.closest('[data-admin-go]');
  if (adminGoEl) {
    event.preventDefault();
    adminSection = adminGoEl.dataset.adminGo;
    renderAdmin();
    return;
  }

  // Toggle user dropdown menu
  if (event.target.closest('#userChipBtn') || event.target.closest('#menuBtn')) {
    $('userMenu').classList.toggle('hidden');
    return;
  }

  if (!$('userMenu').classList.contains('hidden') && !event.target.closest('#userMenu')) {
    $('userMenu').classList.add('hidden');
  }
}

async function handleAction(action, id, targetEl) {
  try {
    switch (action) {
      case 'open-product':
        navigate('details', id);
        break;

      case 'toggle-wishlist':
        const resWish = await api.post(`/wishlist/toggle/${id}`);
        if (currentUser) {
          currentUser.wishlist = resWish.wishlist;
          localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
        }
        toast(resWish.message, 'info');
        renderCurrentView();
        break;

      case 'start-chat':
        const prod = await api.get(`/products/${id}`);
        const convRes = await api.post('/conversations', {
          withEmail: prod.product.sellerEmail,
          productId: id
        });
        activeConversationId = convRes.conversation.id || convRes.conversation._id;
        navigate('chats');
        break;

      case 'send-request':
        askConfirm('Send Purchase Request', 'Submit an offer to the seller for this listing.', 'Send Request', async () => {
          await api.post('/requests', { productId: id });
          toast('Purchase request submitted to seller!', 'success');
          navigate('requests');
        });
        break;

      case 'open-conversation':
        activeConversationId = id;
        renderCurrentView();
        break;

      case 'edit-listing':
        editingProductId = id;
        navigate('sell');
        break;

      case 'delete-listing':
        askConfirm('Delete Listing?', 'This will permanently remove the item from the marketplace.', 'Delete', async () => {
          await api.delete(`/products/${id}`);
          toast('Listing deleted.', 'success');
          renderCurrentView();
        });
        break;

      case 'mark-sold':
        await api.patch(`/products/${id}/status`, { status: 'sold' });
        toast('Listing marked as sold.', 'success');
        renderCurrentView();
        break;

      case 'mark-available':
        await api.patch(`/products/${id}/status`, { status: 'available' });
        toast('Listing marked as available.', 'success');
        renderCurrentView();
        break;

      case 'accept-request':
        await api.patch(`/requests/${id}/status`, { status: 'Accepted' });
        toast('Request accepted! Competing pending requests have been automatically cancelled.', 'success');
        renderCurrentView();
        break;

      case 'reject-request':
        await api.patch(`/requests/${id}/status`, { status: 'Rejected' });
        toast('Request rejected.', 'info');
        renderCurrentView();
        break;

      case 'cancel-request':
        await api.patch(`/requests/${id}/status`, { status: 'Cancelled' });
        toast('Request cancelled.', 'info');
        renderCurrentView();
        break;

      case 'complete-request':
        await api.patch(`/requests/${id}/status`, { status: 'Completed' });
        toast('Transaction marked as completed! You can now leave a verified rating.', 'success');
        renderCurrentView();
        break;

      case 'open-review-modal':
        openReviewModal(id);
        break;

      case 'open-notification':
        const link = targetEl.dataset.link || 'home';
        await api.patch(`/notifications/${id}/read`);
        navigate(link);
        break;

      case 'mark-all-read':
        await api.patch('/notifications/mark-all-read');
        toast('All notifications marked as read.', 'success');
        renderCurrentView();
        break;

      case 'clear-filters':
        searchTerm = '';
        activeCategory = 'All';
        activeCondition = 'All';
        activeListingType = 'All';
        activePricingModel = 'All';
        activeSort = 'newest';
        renderCurrentView();
        break;

      case 'set-category':
        activeCategory = id;
        renderCurrentView();
        break;

      case 'request-tab':
        requestTab = id;
        renderCurrentView();
        break;

      case 'report-product':
        navigate('report', 'product:' + id);
        break;

      case 'report-user':
        navigate('report', 'user:' + id);
        break;

      case 'cancel-sell':
        editingProductId = null;
        navigate('listings');
        break;

      case 'cancel-report':
        navigate('home');
        break;

      case 'reset-demo':
        askConfirm('Reset Demo Database?', 'Restores sample listings, demo accounts, bids and transactions on server.', 'Reset', async () => {
          await api.post('/seed');
          toast('Database reset to fresh demo state.', 'success');
          logout(false);
        });
        break;

      case 'logout':
        logout(true);
        break;
    }
  } catch (err) {
    toast(err.message || 'Action failed.', 'error');
  }
}

async function handleAdminAction(action, id) {
  try {
    switch (action) {
      case 'toggle-user':
        const uRes = await api.patch(`/admin/users/${id}/status`);
        toast(uRes.message, 'success');
        renderAdmin();
        break;

      case 'remove-product':
        askConfirm('Remove Listing?', 'Administrator removal of inappropriate or reported item.', 'Remove', async () => {
          await api.delete(`/products/${id}`);
          toast('Listing removed by admin.', 'success');
          renderAdmin();
        });
        break;

      case 'report-review':
        await api.patch(`/reports/${id}`, { status: 'Under Review' });
        toast('Report marked Under Review.', 'info');
        renderAdmin();
        break;

      case 'report-resolve':
        await api.patch(`/reports/${id}`, { status: 'Resolved' });
        toast('Report marked Resolved.', 'success');
        renderAdmin();
        break;
    }
  } catch (err) {
    toast(err.message || 'Admin action failed.', 'error');
  }
}

/* ==========================================================
   23. FORM SUBMISSION HANDLERS
   ========================================================== */

function onDocumentSubmit(event) {
  const form = event.target;
  const kind = form.dataset.form;

  if (kind === 'sell') return handleSellSubmit(event);
  if (kind === 'place-bid') return handleBidSubmit(event);
  if (kind === 'chat') return handleChatSubmit(event);
  if (kind === 'profile') return handleProfileSubmit(event);
  if (kind === 'report') return handleReportSubmit(event);

  if (form.id === 'loginForm') return handleLogin(event);
  if (form.id === 'registerForm') return handleRegister(event);
}

async function handleSellSubmit(event) {
  event.preventDefault();
  const errorBox = $('sellError');
  errorBox.classList.add('hidden');

  const name = $('sellName').value.trim();
  const category = $('sellCategory').value;
  const condition = $('sellCondition').value;
  const description = $('sellDescription').value.trim();
  let image = $('sellImage').value.trim();

  const listingTypeEl = document.querySelector('input[name="listingType"]:checked');
  const listingType = listingTypeEl ? listingTypeEl.value : 'Sale';

  const pricingModelEl = document.querySelector('input[name="pricingModel"]:checked');
  const pricingModel = (listingType === 'Sale' && pricingModelEl) ? pricingModelEl.value : 'fixed';

  let price = 0;
  let startingBid = 0;
  let minIncrement = 10;
  let auctionDurationHours = 48;

  if (listingType === 'Sale') {
    if (pricingModel === 'bidding') {
      startingBid = Number($('sellStartingBid').value);
      minIncrement = Number($('sellMinIncrement').value) || 10;
      auctionDurationHours = Number($('sellAuctionDuration').value) || 48;
      price = startingBid;
    } else {
      price = Number($('sellPrice').value);
    }
  }

  const exchangeFor = $('sellExchangeFor') ? $('sellExchangeFor').value : '';
  const rentalPeriod = $('sellRentalPeriod') ? $('sellRentalPeriod').value : '';

  // Handle local image file upload if selected
  const fileInput = $('sellImageFile');
  if (fileInput && fileInput.files && fileInput.files[0]) {
    try {
      const formData = new FormData();
      formData.append('image', fileInput.files[0]);
      const uploadRes = await api.upload(formData);
      image = uploadRes.url;
    } catch (err) {
      errorBox.textContent = `Image upload failed: ${err.message}`;
      errorBox.classList.remove('hidden');
      return;
    }
  }

  const payload = {
    name,
    category,
    condition,
    listingType,
    pricingModel,
    price,
    startingBid,
    minIncrement,
    auctionDurationHours,
    exchangeFor,
    rentalPeriod,
    description,
    image
  };

  try {
    if (editingProductId) {
      await api.put(`/products/${editingProductId}`, payload);
      toast('Listing updated successfully.', 'success');
      editingProductId = null;
    } else {
      await api.post('/products', payload);
      toast(pricingModel === 'bidding' ? 'Auction started on campus marketplace!' : 'Item listed successfully!', 'success');
    }
    navigate('listings');
  } catch (err) {
    errorBox.textContent = err.message || 'Failed to save listing.';
    errorBox.classList.remove('hidden');
  }
}

async function handleBidSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const listingId = form.dataset.id;
  const input = form.querySelector('input');
  const amount = Number(input.value);

  if (isNaN(amount) || amount <= 0) {
    toast('Please enter a valid bid amount.', 'error');
    return;
  }

  try {
    const res = await api.post(`/products/${listingId}/bid`, { amount });
    toast(res.message, 'success');
    renderCurrentView();
  } catch (err) {
    toast(err.message || 'Bid rejected.', 'error');
  }
}

async function handleChatSubmit(event) {
  event.preventDefault();
  const input = $('chatInput');
  const text = input.value.trim();
  if (!text || !activeConversationId) return;

  try {
    await api.post(`/conversations/${activeConversationId}/messages`, { text });
    input.value = '';
    await refreshActiveChat();
    scrollChatToBottom();
  } catch (err) {
    toast(err.message || 'Failed to send message.', 'error');
  }
}

async function handleProfileSubmit(event) {
  event.preventDefault();
  const errorBox = $('profileError');
  const name = $('profileName').value.trim();
  const department = $('profileDepartment').value.trim();
  const year = $('profileYear').value.trim();

  errorBox.classList.add('hidden');

  try {
    const data = await api.put('/auth/profile', { name, department, year });
    currentUser = { ...currentUser, ...data.user };
    localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
    $('userChipName').textContent = currentUser.name;
    $('userChipAvatar').textContent = initials(currentUser.name);
    toast('Profile updated successfully.', 'success');
    renderCurrentView();
  } catch (err) {
    errorBox.textContent = err.message;
    errorBox.classList.remove('hidden');
  }
}

async function handleReportSubmit(event) {
  event.preventDefault();
  const errorBox = $('reportError');
  const type = $('reportType').value;
  const reason = $('reportReason').value;
  const description = $('reportDescription').value.trim();
  const targetId = type === 'Product' ? $('reportProduct').value : $('reportUserEmail').value.trim();

  errorBox.classList.add('hidden');

  try {
    await api.post('/reports', { type, targetId, reason, description });
    toast('Report submitted to administrators.', 'success');
    navigate('report');
  } catch (err) {
    errorBox.textContent = err.message;
    errorBox.classList.remove('hidden');
  }
}

function openReviewModal(requestId) {
  let selectedStars = 5;
  const customHtml = `
    <div style="margin:12px 0;">
      <div style="font-weight:600;margin-bottom:6px;">Rate your experience (1 to 5 Stars):</div>
      <div class="star-select" id="modalStarSelect">
        <span data-star="1" class="selected">★</span>
        <span data-star="2" class="selected">★</span>
        <span data-star="3" class="selected">★</span>
        <span data-star="4" class="selected">★</span>
        <span data-star="5" class="selected">★</span>
      </div>
      <label class="field mt-2">
        <span class="field-label">Feedback Comments</span>
        <textarea id="modalReviewComment" placeholder="Share your experience (condition of product, punctuality, communication)..."></textarea>
      </label>
    </div>
  `;

  askConfirm('Rate &amp; Review Completed Transaction', 'Submit trusted feedback for your exchange partner.', 'Submit Review', async () => {
    const comment = $('modalReviewComment').value.trim();
    try {
      const res = await api.post('/reviews', {
        requestId,
        rating: selectedStars,
        comment
      });
      toast(res.message, 'success');
      renderCurrentView();
    } catch (err) {
      toast(err.message, 'error');
    }
  }, customHtml);

  // Attach interactive star selection
  const starContainer = $('modalStarSelect');
  if (starContainer) {
    starContainer.addEventListener('click', (e) => {
      const starEl = e.target.closest('[data-star]');
      if (!starEl) return;
      selectedStars = parseInt(starEl.dataset.star, 10);
      $$('#modalStarSelect span').forEach(s => {
        const val = parseInt(s.dataset.star, 10);
        s.classList.toggle('selected', val <= selectedStars);
      });
    });
  }
}

/* ==========================================================
   24. REAL-TIME INPUTS & CONDITIONAL UI
   ========================================================== */

function onDocumentInput(event) {
  const el = event.target;

  if (el.dataset.input === 'search') {
    searchTerm = el.value;
    updateProductGridLive();
    return;
  }
  if (el.dataset.input === 'sort') {
    activeSort = el.value;
    renderCurrentView();
    return;
  }
  if (el.dataset.input === 'category') {
    activeCategory = el.value;
    updateProductGridLive();
    return;
  }
  if (el.dataset.input === 'condition') {
    activeCondition = el.value;
    updateProductGridLive();
    return;
  }
  if (el.dataset.input === 'listingType') {
    activeListingType = el.value;
    updateProductGridLive();
    return;
  }
  if (el.dataset.input === 'pricingModel') {
    activePricingModel = el.value;
    updateProductGridLive();
    return;
  }

  // Listing Type radio button changes in Sell form
  if (el.dataset.input === 'listing-type-radio') {
    const val = el.value;
    const isSale = val === 'Sale';
    const isRent = val === 'Rent';
    const isExchange = val === 'Exchange';

    if ($('pricingModelGroup')) $('pricingModelGroup').style.display = isSale ? '' : 'none';
    if ($('fixedPriceGroup')) $('fixedPriceGroup').style.display = isSale ? '' : 'none';
    if ($('rentPeriodGroup')) $('rentPeriodGroup').style.display = isRent ? '' : 'none';
    if ($('exchangeGroup')) $('exchangeGroup').style.display = isExchange ? '' : 'none';
    if ($('biddingConfigGroup')) $('biddingConfigGroup').style.display = 'none';
    return;
  }

  // Pricing Model radio button changes in Sell form
  if (el.dataset.input === 'pricing-model-radio') {
    const isBidding = el.value === 'bidding';
    if ($('biddingConfigGroup')) $('biddingConfigGroup').style.display = isBidding ? '' : 'none';
    if ($('fixedPriceGroup')) $('fixedPriceGroup').style.display = isBidding ? 'none' : '';
    return;
  }

  // Image URL live preview
  if (el.dataset.input === 'image-preview') {
    const box = $('imagePreviewBox');
    if (!box) return;
    const url = el.value.trim();
    box.innerHTML = url ? `<img src="${esc(url)}" alt="Preview">` : '<div class="img-fallback">🖼️</div>';
    return;
  }

  // Report type switch
  if (el.dataset.input === 'report-type') {
    const isProduct = el.value === 'Product';
    if ($('reportTargetProductField')) $('reportTargetProductField').classList.toggle('hidden', !isProduct);
    if ($('reportTargetUserField')) $('reportTargetUserField').classList.toggle('hidden', isProduct);
  }
}

async function updateProductGridLive() {
  const queryParams = new URLSearchParams({
    search: searchTerm,
    category: activeCategory,
    condition: activeCondition,
    listingType: activeListingType,
    pricingModel: activePricingModel,
    sort: activeSort,
    status: 'all'
  });

  try {
    const data = await api.get(`/products?${queryParams.toString()}`);
    const area = document.querySelector(`#${VIEW_IDS[currentView]} .product-grid-area`);
    if (area) {
      area.innerHTML = productGrid(data.products || []);
      startAuctionCountdownTicker();
    }
    const counter = $('browseCounter');
    if (counter) counter.textContent = `${(data.products || []).length} item(s) found.`;
  } catch (e) { /* ignore */ }
}

function attachImageFallback() {
  document.addEventListener('error', (event) => {
    const img = event.target;
    if (!img || img.tagName !== 'IMG' || img.dataset.fallbackDone) return;
    img.dataset.fallbackDone = 'yes';
    const parent = img.parentElement;
    if (!parent || parent.querySelector('.img-fallback')) return;
    const box = document.createElement('div');
    box.className = 'img-fallback';
    box.textContent = '🖼️';
    parent.replaceChild(box, img);
  }, true);
}

/* ==========================================================
   25. INITIALIZATION
   ========================================================== */

function init() {
  loadSession();

  // Login & Register Form switches
  $('loginForm').addEventListener('submit', handleLogin);
  $('registerForm').addEventListener('submit', handleRegister);

  $('showRegisterLink').addEventListener('click', (e) => {
    e.preventDefault();
    $('loginForm').classList.add('hidden');
    $('registerForm').classList.remove('hidden');
  });

  $('showLoginLink').addEventListener('click', (e) => {
    e.preventDefault();
    $('registerForm').classList.add('hidden');
    $('loginForm').classList.remove('hidden');
  });

  // Demo one-click fill buttons
  $('fillStudentBtn').addEventListener('click', () => {
    $('loginEmail').value = 'student@demo.edu';
    $('loginPassword').value = 'demo123';
    toast('Student demo credentials filled. Click Login.', 'info');
  });
  $('fillAdminBtn').addEventListener('click', () => {
    $('loginEmail').value = 'admin@demo.edu';
    $('loginPassword').value = 'demo123';
    toast('Admin demo credentials filled. Click Login.', 'info');
  });
  $('fillStaffBtn').addEventListener('click', () => {
    $('loginEmail').value = 'staff@demo.edu';
    $('loginPassword').value = 'demo123';
    toast('Staff demo credentials filled. Click Login.', 'info');
  });

  // Topbar and footer buttons
  $('topbarSellBtn').addEventListener('click', () => goToView('sell'));
  $('menuLogoutBtn').addEventListener('click', () => logout(true));
  $('adminLogoutBtn').addEventListener('click', () => logout(true));
  $('resetDemoBtn').addEventListener('click', () => handleAction('reset-demo'));

  // Confirmation Modal
  $('modalCancelBtn').addEventListener('click', closeConfirm);
  $('modalConfirmBtn').addEventListener('click', () => {
    const cb = confirmCallback;
    closeConfirm();
    if (typeof cb === 'function') cb();
  });
  $('modalRoot').addEventListener('click', (e) => {
    if (e.target === $('modalRoot')) closeConfirm();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeConfirm();
      $('userMenu').classList.add('hidden');
    }
  });

  // Central event listeners
  document.addEventListener('click', onDocumentClick);
  document.addEventListener('input', onDocumentInput);
  document.addEventListener('submit', onDocumentSubmit);

  // History popstate
  window.addEventListener('popstate', () => {
    if (!currentUser) return;
    const route = parseHash();
    currentView = route.view;
    currentParam = route.param;
    renderCurrentView();
  });

  // Decide initial screen
  if (currentUser) {
    if (currentUser.role === 'admin') {
      showAdminShell();
    } else {
      showStudentShell();
      const route = parseHash();
      currentView = route.view;
      currentParam = route.param;
      renderCurrentView();
    }
  } else {
    showAuthScreen();
  }

  attachImageFallback();
}

document.addEventListener('DOMContentLoaded', init);
