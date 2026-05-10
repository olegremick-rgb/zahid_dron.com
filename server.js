const express = require('express');
const session = require('express-session');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// ============ НАЛАШТУВАННЯ ФАЙЛОВОГО СХОВИЩА ============
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');

let db = {
    users: [],
    categories: [],
    products: [],
    orders: [],
    social: [],
    reviews: [],
    about: '',
    aboutSubtitle: 'Ваш надійний партнер у світі професійних дронів та FPV обладнання. Працюємо з 2020 року.',
    contact: '',
    settings: { product_display_style: 'classic' },
    images: { logo: '', banner: '', brandLogo: '', background: '' },
    homeStats: { dronesSold: '500+', rating: '4.9', support: '24/7', original: '100%' },
    partners: ['DJI', 'AUTEL', 'HUBSAN', 'EACHINE'],
    features: [],
    workHours: { monFri: '10:00 - 19:00', sat: '11:00 - 17:00', sun: 'Вихідний' }
};

async function loadDatabase() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        db.users = await readJSON('users.json', [{ username: 'admin', password: 'admin', isAdmin: true }]);
        db.categories = await readJSON('categories.json', ['Дрони', 'Реб']);
        db.products = await readJSON('products.json', []);
        db.orders = await readJSON('orders.json', []);
        db.social = await readJSON('social.json', []);
        db.reviews = await readJSON('reviews.json', []);
        db.about = await readText('about.txt', 'Ми — команда професіоналів...');
        db.aboutSubtitle = await readText('aboutSubtitle.txt', 'Ваш надійний партнер у світі професійних дронів та FPV обладнання. Працюємо з 2020 року.');
        db.contact = await readText('contact.txt', 'Телефон: +380 99 123 45 67\nEmail: info@zahiddrone.com\nГрафік: Пн-Пт 10:00-19:00\nАдреса: м. Львів');
        db.settings = await readJSON('settings.json', { product_display_style: 'classic' });
        db.images = {
            logo: await readText('logo.txt', ''),
            banner: await readText('banner.txt', ''),
            brandLogo: await readText('brand-logo.txt', ''),
            background: await readText('background.txt', '')
        };
        db.homeStats = await readJSON('homeStats.json', db.homeStats);
        db.partners = await readJSON('partners.json', db.partners);
        db.features = await readJSON('features.json', db.features);
        db.workHours = await readJSON('workHours.json', db.workHours);
        console.log('✅ Базу даних завантажено');
    } catch (err) { console.error('❌ Помилка завантаження:', err); }
}

async function readJSON(filename, defaultValue) {
    try { return JSON.parse(await fs.readFile(path.join(DATA_DIR, filename), 'utf8')); } catch { return defaultValue; }
}
async function writeJSON(filename, data) {
    try { await fs.mkdir(DATA_DIR, { recursive: true }); await fs.writeFile(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2)); } catch (err) { console.error('Write error:', err.message); }
}
async function readText(filename, defaultValue) {
    try { return await fs.readFile(path.join(DATA_DIR, filename), 'utf8'); } catch { return defaultValue; }
}
async function writeText(filename, data) {
    try { await fs.mkdir(DATA_DIR, { recursive: true }); await fs.writeFile(path.join(DATA_DIR, filename), data); } catch (err) { console.error('Write error:', err.message); }
}

// ============ EXPRESS ============
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(__dirname));
app.use(session({
    secret: 'zahid-dron-secret-key-2025',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000, secure: false }
}));

// Логування
app.use((req, res, next) => {
    // Ігноруємо логи health check для чистоти
    if (req.url !== '/health' && req.url !== '/robots.txt') {
        console.log(`${req.method} ${req.url}`);
    }
    next();
});

function isAdmin(req, res, next) {
    if (req.session?.user?.isAdmin) return next();
    res.status(403).json({ error: 'Доступ заборонено' });
}

// ============ HEALTH CHECK (для Railway) ============
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// ============ АУТЕНТИФІКАЦІЯ ============
app.get('/api/user', (req, res) => res.json(req.session.user || null));
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = db.users.find(u => u.username === username && u.password === password);
    if (user) {
        req.session.user = { username: user.username, isAdmin: user.isAdmin };
        res.json({ username: user.username, isAdmin: user.isAdmin });
    } else res.status(401).json({ error: 'Невірний логін або пароль' });
});
app.post('/api/logout', (req, res) => { req.session.destroy(() => res.json({ success: true })); });

// ============ КАТЕГОРІЇ ============
app.get('/api/categories', (req, res) => res.json(db.categories));
app.post('/api/categories', isAdmin, async (req, res) => {
    const { category } = req.body;
    if (!category?.trim()) return res.status(400).json({ error: 'Назва обов\'язкова' });
    if (db.categories.includes(category)) return res.status(400).json({ error: 'Вже існує' });
    db.categories.push(category);
    await writeJSON('categories.json', db.categories);
    res.json({ success: true });
});
app.delete('/api/categories/:category', isAdmin, async (req, res) => {
    const cat = decodeURIComponent(req.params.category);
    db.categories = db.categories.filter(c => c !== cat);
    await writeJSON('categories.json', db.categories);
    res.json({ success: true });
});

// ============ ТОВАРИ ============
app.get('/api/products', (req, res) => res.json(db.products));
app.post('/api/products', isAdmin, async (req, res) => {
    try {
        const { name, category, price, description, specs, variants, image, gallery } = req.body;
        if (!name || !category || !price) return res.status(400).json({ error: 'Заповніть поля' });
        const newProduct = {
            id: Date.now(),
            name: name.trim(),
            category,
            price: parseFloat(price),
            description: description || '',
            specs: specs || '',
            variants: variants || [{ name: 'Стандарт', price: null }],
            image: image || null,
            gallery: gallery || [],
            createdAt: new Date().toISOString()
        };
        db.products.push(newProduct);
        await writeJSON('products.json', db.products);
        res.status(201).json(newProduct);
    } catch(e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/products/:id', isAdmin, async (req, res) => {
    const idx = db.products.findIndex(p => p.id == req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Не знайдено' });
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
        updatedAt: new Date().toISOString()
    };
    await writeJSON('products.json', db.products);
    res.json(db.products[idx]);
});
app.delete('/api/products/:id', isAdmin, async (req, res) => {
    db.products = db.products.filter(p => p.id != req.params.id);
    await writeJSON('products.json', db.products);
    res.json({ success: true });
});

// ============ ЗАМОВЛЕННЯ / ВІДГУКИ ============
app.get('/api/orders', isAdmin, (req, res) => res.json(db.orders));
app.post('/api/orders', async (req, res) => {
    const order = { id: Date.now(), ...req.body, date: new Date().toISOString(), status: 'нове' };
    db.orders.push(order);
    await writeJSON('orders.json', db.orders);
    res.status(201).json(order);
});
app.get('/api/reviews', (req, res) => res.json(db.reviews));
app.post('/api/reviews', async (req, res) => {
    const review = { id: Date.now(), ...req.body, date: new Date().toISOString() };
    db.reviews.push(review);
    await writeJSON('reviews.json', db.reviews);
    res.status(201).json(review);
});
app.delete('/api/reviews/:id', isAdmin, async (req, res) => {
    db.reviews = db.reviews.filter(r => r.id != req.params.id);
    await writeJSON('reviews.json', db.reviews);
    res.json({ success: true });
});

// ============ ПРО НАС / КОНТАКТИ ============
app.get('/api/about', (req, res) => res.send(db.about));
app.post('/api/about', isAdmin, async (req, res) => { db.about = req.body.text || ''; await writeText('about.txt', db.about); res.json({ success: true }); });
app.get('/api/about-subtitle', (req, res) => res.send(db.aboutSubtitle));
app.post('/api/about-subtitle', isAdmin, async (req, res) => { db.aboutSubtitle = req.body.text || ''; await writeText('aboutSubtitle.txt', db.aboutSubtitle); res.json({ success: true }); });
app.get('/api/contact', (req, res) => res.send(db.contact));
app.post('/api/contact', isAdmin, async (req, res) => { db.contact = req.body.text || ''; await writeText('contact.txt', db.contact); res.json({ success: true }); });

// ============ СОЦМЕРЕЖІ ============
app.get('/api/social', (req, res) => res.json(db.social));
app.post('/api/social', isAdmin, async (req, res) => { db.social = Array.isArray(req.body) ? req.body : []; await writeJSON('social.json', db.social); res.json({ success: true }); });

// ============ НАЛАШТУВАННЯ ГОЛОВНОЇ ============
app.get('/api/home-stats', (req, res) => res.json(db.homeStats));
app.post('/api/home-stats', isAdmin, async (req, res) => { db.homeStats = { ...db.homeStats, ...req.body }; await writeJSON('homeStats.json', db.homeStats); res.json({ success: true }); });
app.get('/api/partners', (req, res) => res.json(db.partners));
app.post('/api/partners', isAdmin, async (req, res) => { db.partners = req.body; await writeJSON('partners.json', db.partners); res.json({ success: true }); });
app.get('/api/features', (req, res) => res.json(db.features));
app.post('/api/features', isAdmin, async (req, res) => { db.features = req.body; await writeJSON('features.json', db.features); res.json({ success: true }); });
app.get('/api/work-hours', (req, res) => res.json(db.workHours));
app.post('/api/work-hours', isAdmin, async (req, res) => { db.workHours = req.body; await writeJSON('workHours.json', db.workHours); res.json({ success: true }); });

// ============ НАЛАШТУВАННЯ / ЗОБРАЖЕННЯ ============
app.get('/api/settings', (req, res) => res.json(db.settings));
app.post('/api/settings', isAdmin, async (req, res) => { db.settings = { ...db.settings, ...req.body }; await writeJSON('settings.json', db.settings); res.json({ success: true }); });
app.get('/api/logo', (req, res) => res.send(db.images.logo));
app.post('/api/logo', isAdmin, async (req, res) => { db.images.logo = req.body.image || ''; await writeText('logo.txt', db.images.logo); res.json({ path: db.images.logo }); });
app.delete('/api/logo', isAdmin, async (req, res) => { db.images.logo = ''; await writeText('logo.txt', ''); res.json({ success: true }); });
app.get('/api/banner', (req, res) => res.send(db.images.banner));
app.post('/api/banner', isAdmin, async (req, res) => { db.images.banner = req.body.image || ''; await writeText('banner.txt', db.images.banner); res.json({ path: db.images.banner }); });
app.delete('/api/banner', isAdmin, async (req, res) => { db.images.banner = ''; await writeText('banner.txt', ''); res.json({ success: true }); });
app.get('/api/brand-logo', (req, res) => res.send(db.images.brandLogo));
app.post('/api/brand-logo', isAdmin, async (req, res) => { db.images.brandLogo = req.body.image || ''; await writeText('brand-logo.txt', db.images.brandLogo); res.json({ path: db.images.brandLogo }); });
app.delete('/api/brand-logo', isAdmin, async (req, res) => { db.images.brandLogo = ''; await writeText('brand-logo.txt', ''); res.json({ success: true }); });
app.get('/api/background', (req, res) => res.send(db.images.background));
app.post('/api/background', isAdmin, async (req, res) => { db.images.background = req.body.image || ''; await writeText('background.txt', db.images.background); res.json({ path: db.images.background }); });
app.delete('/api/background', isAdmin, async (req, res) => { db.images.background = ''; await writeText('background.txt', ''); res.json({ success: true }); });

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

// Обробка robots.txt
app.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.send('User-agent: *\nDisallow: /admin\nDisallow: /api\nAllow: /\n');
});

// Головна та SPA
app.get('*', (req, res) => {
    // Ігноруємо WordPress-сканери
    if (req.url.includes('wp-') || req.url.includes('.php') || req.url.includes('wordpress')) {
        return res.status(404).end();
    }
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ============ GRACEFUL SHUTDOWN ============
process.on('SIGTERM', () => {
    console.log('SIGTERM отримано, завершуємо роботу...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT отримано, завершуємо роботу...');
    process.exit(0);
});

// ============ ЗАПУСК ============
loadDatabase().then(() => {
    const server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`\n=================================`);
        console.log(`🚀 Сервер: http://localhost:${PORT}`);
        console.log(`📁 Дані: ${DATA_DIR}`);
        console.log(`👤 admin / admin`);
        console.log(`=================================\n`);
    });

    // Keep-alive для Railway
    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;
});
