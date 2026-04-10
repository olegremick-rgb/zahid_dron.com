const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

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

// Логування всіх запитів
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Статичні файли
app.use(express.static(__dirname));

app.use(session({
    secret: 'zahid-dron-secret',
    resave: true,
    saveUninitialized: true
}));

// Перевірка адміна
function isAdmin(req, res, next) {
    if (req.session && req.session.user && req.session.user.isAdmin) {
        return next();
    }
    res.status(403).json({ error: 'Access denied' });
}

// ============ АУТЕНТИФІКАЦІЯ ============
app.get('/api/user', (req, res) => {
    if (req.session.user) {
        res.json(req.session.user);
    } else {
        res.status(401).json({ error: 'Not authorized' });
    }
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
    req.session.destroy(() => res.json({ success: true }));
});

app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
    if (db.users.find(u => u.username === username)) return res.status(400).json({ error: 'User exists' });
    db.users.push({ username, password, isAdmin: false });
    res.status(201).json({ success: true });
});

app.post('/api/admin/change-password', isAdmin, (req, res) => {
    const { currentPassword, newUsername, newPassword } = req.body;
    const idx = db.users.findIndex(u => u.username === req.session.user.username);
    if (idx === -1) return res.status(404).json({ error: 'User not found' });
    if (db.users[idx].password !== currentPassword) return res.status(401).json({ error: 'Wrong password' });
    if (newUsername) db.users[idx].username = newUsername;
    if (newPassword) db.users[idx].password = newPassword;
    res.json({ success: true });
});

// ============ КАТЕГОРІЇ ============
app.get('/api/categories', (req, res) => res.json(db.categories));

app.post('/api/categories', isAdmin, (req, res) => {
    const cat = req.body.category?.trim();
    if (!cat) return res.status(400).json({ error: 'Category required' });
    if (db.categories.includes(cat)) return res.status(400).json({ error: 'Exists' });
    db.categories.push(cat);
    res.json({ success: true });
});

app.delete('/api/categories/:category', isAdmin, (req, res) => {
    const cat = decodeURIComponent(req.params.category);
    const idx = db.categories.indexOf(cat);
    if (idx > -1) db.categories.splice(idx, 1);
    res.json({ success: true });
});

// ============ ТОВАРИ ============
app.get('/api/products', (req, res) => res.json(db.products));

app.post('/api/products', isAdmin, (req, res) => {
    try {
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
            images: [],
            createdAt: new Date().toISOString()
        };
        db.products.push(product);
        res.status(201).json(product);
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
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
    res.json({ success: true });
});

// ============ ЗАМОВЛЕННЯ ============
app.get('/api/orders', isAdmin, (req, res) => res.json(db.orders));

app.post('/api/orders', (req, res) => {
    const order = { id: Date.now(), ...req.body, date: new Date().toISOString(), status: 'нове' };
    db.orders.push(order);
    res.status(201).json(order);
});

// ============ ВІДГУКИ ============
app.get('/api/reviews', (req, res) => res.json(db.reviews));

app.post('/api/reviews', (req, res) => {
    const review = { id: Date.now(), ...req.body, date: new Date().toISOString() };
    db.reviews.push(review);
    res.status(201).json(review);
});

app.delete('/api/reviews/:id', isAdmin, (req, res) => {
    const idx = db.reviews.findIndex(r => r.id == req.params.id);
    if (idx > -1) db.reviews.splice(idx, 1);
    res.json({ success: true });
});

// ============ ПРО НАС / КОНТАКТИ ============
app.get('/api/about', (req, res) => res.send(db.about));
app.post('/api/about', isAdmin, (req, res) => { db.about = req.body.text; res.json({ success: true }); });

app.get('/api/contact', (req, res) => res.send(db.contact));
app.post('/api/contact', isAdmin, (req, res) => { db.contact = req.body.text; res.json({ success: true }); });

// ============ СОЦМЕРЕЖІ ============
app.get('/api/social', (req, res) => res.json(db.social));
app.post('/api/social', isAdmin, (req, res) => { db.social = req.body; res.json({ success: true }); });

// ============ НАЛАШТУВАННЯ ============
app.get('/api/settings', (req, res) => res.json(db.settings));
app.post('/api/settings', isAdmin, (req, res) => { db.settings = { ...db.settings, ...req.body }; res.json({ success: true }); });

// ============ ЗОБРАЖЕННЯ ============
app.get('/api/logo', (req, res) => res.send(db.images.logo || ''));
app.post('/api/logo', isAdmin, express.json({ limit: '10mb' }), (req, res) => {
    db.images.logo = req.body.image || req.body.path || '';
    res.json({ path: db.images.logo });
});
app.delete('/api/logo', isAdmin, (req, res) => { db.images.logo = ''; res.json({ success: true }); });

app.get('/api/banner', (req, res) => res.send(db.images.banner || ''));
app.post('/api/banner', isAdmin, express.json({ limit: '10mb' }), (req, res) => {
    db.images.banner = req.body.image || req.body.path || '';
    res.json({ path: db.images.banner });
});
app.delete('/api/banner', isAdmin, (req, res) => { db.images.banner = ''; res.json({ success: true }); });

app.get('/api/brand-logo', (req, res) => res.send(db.images.brandLogo || ''));
app.post('/api/brand-logo', isAdmin, express.json({ limit: '10mb' }), (req, res) => {
    db.images.brandLogo = req.body.image || req.body.path || '';
    res.json({ path: db.images.brandLogo });
});
app.delete('/api/brand-logo', isAdmin, (req, res) => { db.images.brandLogo = ''; res.json({ success: true }); });

app.get('/api/background', (req, res) => res.send(db.images.background || ''));
app.post('/api/background', isAdmin, express.json({ limit: '10mb' }), (req, res) => {
    db.images.background = req.body.image || req.body.path || '';
    res.json({ path: db.images.background });
});
app.delete('/api/background', isAdmin, (req, res) => { db.images.background = ''; res.json({ success: true }); });

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

// Всі інші запити -> index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Запуск
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`http://localhost:${PORT}`);
});
