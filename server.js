const express = require('express');
const session = require('express-session');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// ============ НАЛАШТУВАННЯ ФАЙЛОВОГО СХОВИЩА ============
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');

async function readJSON(filename, defaultValue = []) {
    try {
        const data = await fs.readFile(path.join(DATA_DIR, filename), 'utf8');
        return JSON.parse(data);
    } catch {
        return defaultValue;
    }
}

async function writeJSON(filename, data) {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2));
}

let db = {
    users: [],
    categories: [],
    products: [],
    orders: [],
    social: [],
    reviews: [],
    about: '',
    contact: '',
    settings: {},
    images: {}
};

async function loadDatabase() {
    try {
        db.users = await readJSON('users.json', [{ username: 'admin', password: 'admin', isAdmin: true }]);
        db.categories = await readJSON('categories.json', ['Дрони', 'Реб']);
        db.products = await readJSON('products.json', []);
        db.orders = await readJSON('orders.json', []);
        db.social = await readJSON('social.json', []);
        db.reviews = await readJSON('reviews.json', []);
        db.about = await readText('about.txt', 'Ми — команда професіоналів...');
        db.contact = await readText('contact.txt', 'Телефон: +380 99 123 45 67\nEmail: info@zahiddrone.com\nГрафік: Пн-Пт 10:00-19:00\nАдреса: м. Львів');
        db.settings = await readJSON('settings.json', { product_display_style: 'classic' });
        db.images = {
            logo: await readText('logo.txt', ''),
            banner: await readText('banner.txt', ''),
            brandLogo: await readText('brand-logo.txt', ''),
            background: await readText('background.txt', '')
        };
        console.log('✅ Базу даних завантажено з:', DATA_DIR);
    } catch (err) {
        console.error('Помилка завантаження БД:', err);
    }
}

async function readText(filename, defaultValue) {
    try {
        return await fs.readFile(path.join(DATA_DIR, filename), 'utf8');
    } catch {
        return defaultValue;
    }
}

async function writeText(filename, data) {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(path.join(DATA_DIR, filename), data);
}

async function saveUsers() { await writeJSON('users.json', db.users); }
async function saveCategories() { await writeJSON('categories.json', db.categories); }
async function saveProducts() { await writeJSON('products.json', db.products); }
async function saveOrders() { await writeJSON('orders.json', db.orders); }
async function saveSocial() { await writeJSON('social.json', db.social); }
async function saveReviews() { await writeJSON('reviews.json', db.reviews); }
async function saveAbout() { await writeText('about.txt', db.about); }
async function saveContact() { await writeText('contact.txt', db.contact); }
async function saveSettings() { await writeJSON('settings.json', db.settings); }
async function saveLogo() { await writeText('logo.txt', db.images.logo); }
async function saveBanner() { await writeText('banner.txt', db.images.banner); }
async function saveBrandLogo() { await writeText('brand-logo.txt', db.images.brandLogo); }
async function saveBackground() { await writeText('background.txt', db.images.background); }

// ============ EXPRESS ============
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(__dirname));

app.use(session({
    secret: 'zahid-dron-secret-key-2025',
    resave: true,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

function isAdmin(req, res, next) {
    if (req.session?.user?.isAdmin) return next();
    res.status(403).json({ error: 'Доступ заборонено' });
}

// ============ АУТЕНТИФІКАЦІЯ ============
app.get('/api/user', (req, res) => res.json(req.session.user || null));

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = db.users.find(u => u.username === username && u.password === password);
    if (user) {
        req.session.user = { username: user.username, isAdmin: user.isAdmin };
        res.json({ username: user.username, isAdmin: user.isAdmin });
    } else {
        res.status(401).json({ error: 'Невірний логін або пароль' });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy(() => res.json({ success: true }));
});

app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Заповніть всі поля' });
    if (db.users.find(u => u.username === username)) return res.status(400).json({ error: 'Користувач вже існує' });
    db.users.push({ username, password, isAdmin: false });
    await saveUsers();
    res.status(201).json({ success: true });
});

app.post('/api/admin/change-password', isAdmin, async (req, res) => {
    const { currentPassword, newUsername, newPassword } = req.body;
    const user = db.users.find(u => u.username === req.session.user.username);
    if (!user) return res.status(404).json({ error: 'Користувача не знайдено' });
    if (user.password !== currentPassword) return res.status(401).json({ error: 'Невірний поточний пароль' });
    if (newUsername) user.username = newUsername;
    if (newPassword) user.password = newPassword;
    await saveUsers();
    req.session.user.username = user.username;
    res.json({ success: true });
});

// ============ КАТЕГОРІЇ ============
app.get('/api/categories', (req, res) => res.json(db.categories));

app.post('/api/categories', isAdmin, async (req, res) => {
    const { category } = req.body;
    if (!category?.trim()) return res.status(400).json({ error: 'Назва обов\'язкова' });
    if (db.categories.includes(category)) return res.status(400).json({ error: 'Категорія вже існує' });
    db.categories.push(category);
    await saveCategories();
    res.json({ success: true });
});

app.delete('/api/categories/:category', isAdmin, async (req, res) => {
    const cat = decodeURIComponent(req.params.category);
    if (db.products.some(p => p.category === cat)) return res.status(400).json({ error: 'Категорія має товари' });
    const idx = db.categories.indexOf(cat);
    if (idx > -1) db.categories.splice(idx, 1);
    await saveCategories();
    res.json({ success: true });
});

// ============ ТОВАРИ ============
app.get('/api/products', (req, res) => res.json(db.products));

app.post('/api/products', isAdmin, async (req, res) => {
    try {
        const { name, category, price, description, specs, variants, image, gallery } = req.body;
        if (!name || !category || !price) return res.status(400).json({ error: 'Заповніть обов\'язкові поля' });
        
        const newProduct = {
            id: Date.now(),
            name: name.trim(),
            category,
            price: parseFloat(price),
            description: description || '',
            specs: specs || '',
            variants: variants || ['Стандарт'],
            image: image || null,
            gallery: gallery || [],
            images: gallery || [],
            createdAt: new Date().toISOString()
        };
        db.products.push(newProduct);
        await saveProducts();
        res.status(201).json(newProduct);
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/products/:id', isAdmin, async (req, res) => {
    try {
        const idx = db.products.findIndex(p => p.id == req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Товар не знайдено' });
        const { name, category, price, description, specs, variants, image, gallery } = req.body;
        db.products[idx] = {
            ...db.products[idx],
            name: name?.trim() || db.products[idx].name,
            category: category || db.products[idx].category,
            price: price ? parseFloat(price) : db.products[idx].price,
            description: description !== undefined ? description : db.products[idx].description,
            specs: specs !== undefined ? specs : db.products[idx].specs,
            variants: variants || db.products[idx].variants,
            image: image !== undefined ? image : db.products[idx].image,
            gallery: gallery !== undefined ? gallery : db.products[idx].gallery,
            images: gallery !== undefined ? gallery : db.products[idx].images,
            updatedAt: new Date().toISOString()
        };
        await saveProducts();
        res.json(db.products[idx]);
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/products/:id', isAdmin, async (req, res) => {
    const idx = db.products.findIndex(p => p.id == req.params.id);
    if (idx > -1) db.products.splice(idx, 1);
    await saveProducts();
    res.json({ success: true });
});

// ============ ЗАМОВЛЕННЯ ============
app.get('/api/orders', isAdmin, (req, res) => res.json(db.orders));

app.post('/api/orders', async (req, res) => {
    const order = { id: Date.now(), ...req.body, date: new Date().toISOString(), status: 'нове' };
    db.orders.push(order);
    await saveOrders();
    res.status(201).json(order);
});

// ============ ВІДГУКИ ============
app.get('/api/reviews', (req, res) => res.json(db.reviews));

app.post('/api/reviews', async (req, res) => {
    const review = { id: Date.now(), ...req.body, date: new Date().toISOString() };
    db.reviews.push(review);
    await saveReviews();
    res.status(201).json(review);
});

app.delete('/api/reviews/:id', isAdmin, async (req, res) => {
    const idx = db.reviews.findIndex(r => r.id == req.params.id);
    if (idx > -1) db.reviews.splice(idx, 1);
    await saveReviews();
    res.json({ success: true });
});

// ============ ПРО НАС / КОНТАКТИ ============
app.get('/api/about', (req, res) => res.send(db.about));
app.post('/api/about', isAdmin, async (req, res) => { db.about = req.body.text || ''; await saveAbout(); res.json({ success: true }); });

app.get('/api/contact', (req, res) => res.send(db.contact));
app.post('/api/contact', isAdmin, async (req, res) => { db.contact = req.body.text || ''; await saveContact(); res.json({ success: true }); });

// ============ СОЦМЕРЕЖІ ============
app.get('/api/social', (req, res) => res.json(db.social));
app.post('/api/social', isAdmin, async (req, res) => { db.social = Array.isArray(req.body) ? req.body : []; await saveSocial(); res.json({ success: true }); });

// ============ НАЛАШТУВАННЯ ============
app.get('/api/settings', (req, res) => res.json(db.settings));
app.post('/api/settings', isAdmin, async (req, res) => { db.settings = { ...db.settings, ...req.body }; await saveSettings(); res.json({ success: true }); });

// ============ ЗОБРАЖЕННЯ ============
app.get('/api/logo', (req, res) => res.send(db.images.logo));
app.post('/api/logo', isAdmin, async (req, res) => { db.images.logo = req.body.image || ''; await saveLogo(); res.json({ path: db.images.logo }); });
app.delete('/api/logo', isAdmin, async (req, res) => { db.images.logo = ''; await saveLogo(); res.json({ success: true }); });

app.get('/api/banner', (req, res) => res.send(db.images.banner));
app.post('/api/banner', isAdmin, async (req, res) => { db.images.banner = req.body.image || ''; await saveBanner(); res.json({ path: db.images.banner }); });
app.delete('/api/banner', isAdmin, async (req, res) => { db.images.banner = ''; await saveBanner(); res.json({ success: true }); });

app.get('/api/brand-logo', (req, res) => res.send(db.images.brandLogo));
app.post('/api/brand-logo', isAdmin, async (req, res) => { db.images.brandLogo = req.body.image || ''; await saveBrandLogo(); res.json({ path: db.images.brandLogo }); });
app.delete('/api/brand-logo', isAdmin, async (req, res) => { db.images.brandLogo = ''; await saveBrandLogo(); res.json({ success: true }); });

app.get('/api/background', (req, res) => res.send(db.images.background));
app.post('/api/background', isAdmin, async (req, res) => { db.images.background = req.body.image || ''; await saveBackground(); res.json({ path: db.images.background }); });
app.delete('/api/background', isAdmin, async (req, res) => { db.images.background = ''; await saveBackground(); res.json({ success: true }); });

// ============ СТАТИСТИКА ============
app.get('/api/stats', isAdmin, (req, res) => {
    res.json({
        productsCount: db.products.length,
        categoriesCount: db.categories.length,
        ordersCount: db.orders.length,
        variantsCount: db.products.reduce((s, p) => s + (p.variants?.length || 0), 0)
    });
});

// ============ СТОРІНКИ ============
app.get('/admin', (req, res) => {
    if (!req.session?.user?.isAdmin) return res.redirect('/');
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get('*', (req, res) => {
    if (req.url.includes('wp-') || req.url.includes('.php')) return res.status(404).end();
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Запуск
loadDatabase().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`\n=================================`);
        console.log(`🚀 Сервер: http://localhost:${PORT}`);
        console.log(`📁 Дані: ${DATA_DIR}`);
        console.log(`=================================\n`);
    });
});
