const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Дані в пам'яті
const db = {
    users: [{ username: 'admin', password: 'admin', isAdmin: true }],
    categories: ['Дрони', 'Реб'],
    products: [],
    orders: [],
    social: [],
    reviews: [],
    about: 'Ми — команда професіоналів.',
    contact: 'Телефон: +380 99 123 45 67\nEmail: info@example.com',
    settings: { product_display_style: 'classic' },
    images: { logo: '', banner: '', brandLogo: '', background: '' }
};

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(__dirname));

// Проста сесія без попередження
app.use(session({
    secret: 'zahid-dron-secret',
    resave: true,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// Блокування ботів
app.use((req, res, next) => {
    const blocked = ['wp-login', 'wp-admin', 'wordpress', 'xmlrpc', '.env', 'phpmyadmin'];
    if (blocked.some(path => req.url.toLowerCase().includes(path))) {
        return res.status(404).end();
    }
    next();
});

// Перевірка адміна
const isAdmin = (req, res, next) => {
    if (req.session?.user?.isAdmin) return next();
    res.status(403).json({ error: 'Access denied' });
};

// API маршрути
app.get('/api/user', (req, res) => {
    res.json(req.session.user || null);
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = db.users.find(u => u.username === username && u.password === password);
    if (user) {
        req.session.user = { username: user.username, isAdmin: user.isAdmin };
        res.json({ username: user.username, isAdmin: user.isAdmin });
    } else {
        res.status(401).json({ error: 'Wrong credentials' });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/categories', (req, res) => res.json(db.categories));

app.post('/api/categories', isAdmin, (req, res) => {
    const cat = req.body.category?.trim();
    if (!cat) return res.status(400).json({ error: 'Category required' });
    if (db.categories.includes(cat)) return res.status(400).json({ error: 'Exists' });
    db.categories.push(cat);
    res.json({ ok: true });
});

app.delete('/api/categories/:cat', isAdmin, (req, res) => {
    const cat = decodeURIComponent(req.params.cat);
    const idx = db.categories.indexOf(cat);
    if (idx > -1) db.categories.splice(idx, 1);
    res.json({ ok: true });
});

app.get('/api/products', (req, res) => res.json(db.products));

app.post('/api/products', isAdmin, (req, res) => {
    const { name, category, price, description, specs, variants, image } = req.body;
    if (!name || !category || !price) {
        return res.status(400).json({ error: 'Missing fields' });
    }
    const product = {
        id: Date.now(),
        name: name.trim(),
        category,
        price: Number(price),
        description: description || '',
        specs: specs || '',
        variants: variants || ['Стандарт'],
        image: image || null,
        gallery: [],
        createdAt: new Date().toISOString()
    };
    db.products.push(product);
    res.status(201).json(product);
});

app.put('/api/products/:id', isAdmin, (req, res) => {
    const idx = db.products.findIndex(p => p.id == req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    
    const { name, category, price, description, specs, variants, image } = req.body;
    db.products[idx] = {
        ...db.products[idx],
        name: name?.trim() || db.products[idx].name,
        category: category || db.products[idx].category,
        price: price ? Number(price) : db.products[idx].price,
        description: description || db.products[idx].description,
        specs: specs || db.products[idx].specs,
        variants: variants || db.products[idx].variants,
        image: image || db.products[idx].image,
        updatedAt: new Date().toISOString()
    };
    res.json(db.products[idx]);
});

app.delete('/api/products/:id', isAdmin, (req, res) => {
    const idx = db.products.findIndex(p => p.id == req.params.id);
    if (idx > -1) db.products.splice(idx, 1);
    res.json({ ok: true });
});

app.get('/api/orders', isAdmin, (req, res) => res.json(db.orders));

app.post('/api/orders', (req, res) => {
    const order = { id: Date.now(), ...req.body, date: new Date().toISOString(), status: 'new' };
    db.orders.push(order);
    res.status(201).json(order);
});

app.get('/api/reviews', (req, res) => res.json(db.reviews));

app.post('/api/reviews', (req, res) => {
    const review = { id: Date.now(), ...req.body, date: new Date().toISOString() };
    db.reviews.push(review);
    res.status(201).json(review);
});

app.delete('/api/reviews/:id', isAdmin, (req, res) => {
    const idx = db.reviews.findIndex(r => r.id == req.params.id);
    if (idx > -1) db.reviews.splice(idx, 1);
    res.json({ ok: true });
});

app.get('/api/about', (req, res) => res.send(db.about));
app.post('/api/about', isAdmin, (req, res) => { db.about = req.body.text; res.json({ ok: true }); });

app.get('/api/contact', (req, res) => res.send(db.contact));
app.post('/api/contact', isAdmin, (req, res) => { db.contact = req.body.text; res.json({ ok: true }); });

app.get('/api/social', (req, res) => res.json(db.social));
app.post('/api/social', isAdmin, (req, res) => { db.social = req.body; res.json({ ok: true }); });

app.get('/api/settings', (req, res) => res.json(db.settings));
app.post('/api/settings', isAdmin, (req, res) => { db.settings = { ...db.settings, ...req.body }; res.json({ ok: true }); });

app.get('/api/logo', (req, res) => res.send(db.images.logo));
app.get('/api/banner', (req, res) => res.send(db.images.banner));
app.get('/api/brand-logo', (req, res) => res.send(db.images.brandLogo));
app.get('/api/background', (req, res) => res.send(db.images.background));

app.get('/api/stats', isAdmin, (req, res) => {
    res.json({
        products: db.products.length,
        categories: db.categories.length,
        orders: db.orders.length,
        variants: db.products.reduce((s, p) => s + (p.variants?.length || 0), 0)
    });
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Сторінки
app.get('/admin', (req, res) => {
    if (!req.session?.user?.isAdmin) return res.redirect('/');
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('*', (req, res) => {
    // Ігноруємо запити ботів
    if (req.url.includes('wp-') || req.url.includes('.php') || req.url.includes('.env')) {
        return res.status(404).end();
    }
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Запуск
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

// Для Railway - відповідаємо на health checks швидко
server.keepAliveTimeout = 5000;
server.headersTimeout = 6000;
