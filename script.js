 
const API_BASE =
  window.location.hostname === 'localhost'
    ? 'http://localhost:3001/api'
    : 'https://campusfoodorderingsystembcknd.onrender.com/api';


function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('token');
    if (token) {
        options.headers = {
            ...options.headers,
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        };
    }
    return fetch(url, options);
}

async function handleResponse(res) {
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Server error' }));
        throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
}

function getTokenPayload() {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
        const payload = token.split('.')[1];
        return JSON.parse(atob(payload));
    } catch (e) {
        return null;
    }
}

    async function loginUser(email, password) {
        const res = await fetch(`${API_BASE}/login/user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await handleResponse(res);
        localStorage.setItem('token', data.token);
        return data;
    }

    async function loginAdmin(email, password) {
        const res = await fetch(`${API_BASE}/login/admin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await handleResponse(res);
        localStorage.setItem('token', data.token);
        return data;
    }


async function performRegister(email, password, isAdmin = false) {
    const endpoint = isAdmin ? '/register/admin' : '/register/user';
    try {
        const res = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await handleResponse(res);
        showToast('Registered successfully! Please log in.', 'success');
        setTimeout(() => window.location.href = 'login.html', 600);
    } catch (err) {
        showToast('Registration failed: ' + err.message, 'error');
    }
}

function getCart() {
    return JSON.parse(localStorage.getItem('cart') || '[]');
}

function saveCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
}

function addToCart(id, name, price) {
    let cart = getCart();
    const existing = cart.find(item => item.id === id);
    if (existing) existing.quantity += 1;
    else cart.push({ id, name, price: parseFloat(price), quantity: 1 });
    saveCart(cart);
    showToast(`${name} added to cart!`, 'success');
}

function removeFromCart(id) {
    let cart = getCart();
    const index = cart.findIndex(item => item.id === id);
    if (index === -1) return showToast('Item not found in cart', 'error');
    const removed = cart.splice(index, 1)[0];
    saveCart(cart);
    showToast(`${removed.name} removed from cart`, 'error');
    loadCart();
}

function checkout() {
    const cart = getCart();
    if (cart.length === 0) {
        showToast('Your cart is empty!', 'info');
        return;
    }
    const items = cart.map(item => ({
        menu_item_id: item.id,
        quantity: item.quantity,
        price: item.price
    }));
    const total_price = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    fetchWithAuth(`${API_BASE}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, total_price })
    })
    .then(handleResponse)
    .then(() => {
        showToast('Order placed successfully!', 'success');
        saveCart([]);
        loadCart();
    })
    .catch(err => showToast('Checkout failed: ' + err.message, 'error'));
}

document.addEventListener('DOMContentLoaded', () => {

    ensureToastContainer();

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async e => {
            e.preventDefault();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const isAdmin = document.getElementById('is-admin')?.checked;
            try {
                await (isAdmin ? loginAdmin(email, password) : loginUser(email, password));
                showToast('Login successful', 'success');
                setTimeout(() => { window.location.href = isAdmin ? 'admin.html' : 'index2.html'; }, 600);
            } catch (err) {
                showToast('Login failed: ' + err.message, 'error');
            }
        });
    }


    if (window.location.pathname.endsWith('index2.html') || window.location.pathname.endsWith('/index2.html')) {
        const payload = getTokenPayload();
        if (!payload) window.location.href = 'login.html';
    }

    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async e => {
            e.preventDefault();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const isAdmin = document.getElementById('is-admin')?.checked;
            try {
                await performRegister(email, password, isAdmin);
            } catch (err) {
                showToast('Registration failed: ' + err.message, 'error');
            }
        });
    }


    if (document.getElementById('menu-items')) {
        loadMenu();
    }


    const addItemForm = document.getElementById('add-item-form');
    if (addItemForm) {
            addItemForm.addEventListener('submit', e => {
            e.preventDefault();
            const formData = new FormData(addItemForm);
            const data = Object.fromEntries(formData);
            data.price = parseFloat(data.price);
            fetchWithAuth(`${API_BASE}/menu`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
                .then(handleResponse)
                .then(() => {
                    showToast('Menu item added!', 'success');
                    addItemForm.reset();
                })
                .catch(err => showToast('Add failed: ' + err.message, 'error'));
        });
        loadOrders(true);
    }

    
    if (document.getElementById('profile-info')) {
        loadProfile();
            document.getElementById('update-profile-form')?.addEventListener('submit', e => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const body = {};
            if (formData.get('email').trim()) body.email = formData.get('email').trim();
            if (formData.get('password')) body.password = formData.get('password');
            if (Object.keys(body).length === 0) {
                    showToast('Nothing to update', 'info');
                return;
            }
            fetchWithAuth(`${API_BASE}/profile`, { method: 'PUT', body: JSON.stringify(body) })
                .then(() => {
                    showToast('Profile updated!', 'success');
                    loadProfile();
                })
                .catch(err => showToast('Update failed: ' + err.message, 'error'));
        });
        document.getElementById('delete-account-btn')?.addEventListener('click', () => {
            if (confirm('Delete account permanently?')) {
                    fetchWithAuth(`${API_BASE}/profile`, { method: 'DELETE' })
                        .then(() => {
                            localStorage.removeItem('token');
                            showToast('Account deleted', 'success');
                            setTimeout(() => window.location.href = 'index.html', 600);
                        })
                        .catch(err => showToast('Delete failed: ' + err.message, 'error'));
                }
        });
    }

 
    if (document.getElementById('cart-items')) {
        loadCart();
        document.getElementById('checkout-btn')?.addEventListener('click', checkout);
    }

   
    const ordersListEl = document.getElementById('orders-list');
    if (ordersListEl) {
        const payload = getTokenPayload();
        const isAdminPage = window.location.pathname.endsWith('/admin.html') || window.location.pathname.endsWith('admin.html');
        if (isAdminPage) {
            if (!payload || payload.type !== 'admin') {
                
                window.location.href = 'login.html';
            } else {
                loadOrders(true);
                startOrdersPolling(true);
            }
        } else {
            
            loadOrders(false);
            startOrdersPolling(false);
        }
    }
});

function ensureToastContainer() {
    let c = document.querySelector('.toast-container');
    if (!c) {
        c = document.createElement('div');
        c.className = 'toast-container';
        document.body.appendChild(c);
    }
    return c;
}

function showToast(message, type = 'info', timeout = 3000) {
    const container = ensureToastContainer();
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.textContent = message;
    container.appendChild(t);
    
    void t.offsetWidth;
    t.classList.add('show');
    setTimeout(() => {
        t.classList.remove('show');
        setTimeout(() => t.remove(), 220);
    }, timeout);
}

function loadMenu() {
    fetch(`${API_BASE}/menu`)
        .then(handleResponse)
        .then(items => {
            const container = document.getElementById('menu-items');
            container.innerHTML = items.length === 0 ? '<p>No items available.</p>' : '';
            items.forEach(item => {
                const card = document.createElement('div');
                card.className = 'menu-card';
                card.innerHTML = `
                    <img src="${item.image_url || 'images/placeholder-food.jpg'}" alt="${item.name}" onerror="this.src='images/placeholder-food.jpg'">
                    <div class="menu-card-content">
                        <h3>${item.name}</h3>
                        <p>${item.description || ''}</p>
                        <div class="menu-card-price">$${parseFloat(item.price).toFixed(2)}</div>
                        <button class="add-to-cart-btn" data-id="${item.id}" data-name="${item.name}" data-price="${item.price}">Add to Cart</button>
                    </div>
                `;
                container.appendChild(card);
            });
           
            document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    addToCart(btn.dataset.id, btn.dataset.name, btn.dataset.price);
                });
            });
        })
        .catch(err => {
            const container = document.getElementById('menu-items');
            if (container) container.innerHTML = '<p>Failed to load menu.</p>';
            console.error('Menu load error:', err);
        });
}

function loadOrders(isAdmin = false) {
    fetchWithAuth(`${API_BASE}/orders`)
        .then(handleResponse)
        .then(orders => {
            const list = document.getElementById('orders-list');
            list.innerHTML = '';
            orders.forEach(order => {
                const div = document.createElement('div');
                div.className = 'card';
                div.innerHTML = `<strong>Order #${order.id}</strong> - Total: $${order.total_price} - Status: ${order.status}`;
                
                if (order.items && order.items.length > 0) {
                    const itemsHtml = order.items.map(it => `<div>${it.menu_item_name || it.menu_item_id} x${it.quantity} - $${parseFloat(it.price).toFixed(2)}</div>`).join('');
                    div.innerHTML += `<div class="order-items">${itemsHtml}</div>`;
                }
                if (isAdmin) {
                    div.innerHTML += ` <button class="btn btn-pending" onclick="updateOrderStatus(${order.id}, 'pending')">Pending</button>
                                      <button class="btn btn-preparing" onclick="updateOrderStatus(${order.id}, 'preparing')">Preparing</button>
                                      <button class="btn btn-ready" onclick="updateOrderStatus(${order.id}, 'ready')">Ready</button>`;
                }
                list.appendChild(div);
            });
        })
        .catch(err => {
            console.error('Failed to load orders:', err);
            const list = document.getElementById('orders-list');
            if (list) list.innerHTML = '<p>Failed to load orders.</p>';
        });
}


let ordersPollInterval = null;
function startOrdersPolling(isAdmin) {
    if (ordersPollInterval) clearInterval(ordersPollInterval);
    
    ordersPollInterval = setInterval(() => loadOrders(isAdmin), 5000);
}


function addMenuItem() {
    const name = document.getElementById('item-name')?.value?.trim();
    const description = document.getElementById('item-desc')?.value?.trim();
    const price = parseFloat(document.getElementById('item-price')?.value);
    const image_url = document.getElementById('item-image')?.value?.trim();
    if (!name || isNaN(price)) return showToast('Name and valid price are required', 'error');
    fetchWithAuth(`${API_BASE}/menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, price, image_url })
    })
    .then(handleResponse)
    .then(() => {
        showToast('Menu item added', 'success');
        
        document.getElementById('item-name').value = '';
        document.getElementById('item-desc').value = '';
        document.getElementById('item-price').value = '';
        document.getElementById('item-image').value = '';
    })
    .catch(err => showToast('Add failed: ' + err.message, 'error'));
 }


function updateOrderStatus(id, status) {
    fetchWithAuth(`${API_BASE}/orders/${id}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
        .then(handleResponse)
        .then(() => {
            showToast('Order updated', 'success');
            loadOrders(true);
        })
        .catch(err => showToast('Update failed: ' + err.message, 'error'));
}

function loadProfile() {
    fetchWithAuth(`${API_BASE}/profile`)
        .then(handleResponse)
        .then(data => {
            document.getElementById('profile-info').innerHTML = `
                <p><strong>Email:</strong> ${data.email}</p>
                <p><strong>Member Since:</strong> ${new Date(data.created_at).toLocaleDateString()}</p>
            `;
        })
        .catch(() => window.location.href = 'login.html');
}

function loadCart() {
    const cart = getCart();
    const list = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total');
    list.innerHTML = '';
    let total = 0;
    cart.forEach(item => {
        total += item.price * item.quantity;
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <div class="cart-item-info">${item.name} x${item.quantity} - $${(item.price * item.quantity).toFixed(2)}</div>
            <div class="cart-item-actions">
                <button class="btn-remove" data-id="${item.id}">Remove</button>
            </div>
        `;
        list.appendChild(div);
    });
    totalEl.textContent = total.toFixed(2);
    
    document.querySelectorAll('.btn-remove').forEach(btn => {
        btn.addEventListener('click', () => removeFromCart(btn.dataset.id));
    });
}