const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// ============ БАЗА ДАНИХ В ПАМ'ЯТІ (без файлів) ============
const db = {
    users: [{ username: 'admin', password: 'admin', isAdmin: true }],
    categories: ['Дрони', 'Реб'],
    products: [],
    orders: [],
    social: [],
    reviews: [],
    about: 'Ми — команда професіоналів, яка займається продажем дронів та комплектуючих.',
    contact: 'Телефон: +380 99 123 45 67\nEmail: info@zahiddrone.com\nГрафік: Пн-Пт 10:00-19:00\nАдреса: м. Львів',
    settings: { product_display_style: 'classic' },
    images: {
        logo: '',
        banner: '',
        brandLogo: '',
        background: ''
    }
};

// ============ НАЛАШТУВАННЯ ============
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Статичні файли - ВАЖЛИВО: має бути перед всіма маршрутами
app.use(express.static(__dirname));

app.use(session({
    secret: 'zahid-dron-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// Логування
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Перевірка адміна
function isAdmin(req, res, next) {
    if (req.session && req.session.user && req.session.user.isAdmin) {
        return next();
    }
    res.status(403).json({ error: 'Доступ заборонено' });
}

// ============ АУТЕНТИФІКАЦІЯ ============
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
        res.status(401).json({ error: 'Невірний логін або пароль' });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy(() => res.json({ success: true }));
});

// ============ КАТЕГОРІЇ ============
app.get('/api/categories', (req, res) => res.json(db.categories));

app.post('/api/categories', isAdmin, (req, res) => {
    const { category } = req.body;
    if (!category || !category.trim()) return res.status(400).json({ error: 'Назва обов\'язкова' });
    if (db.categories.includes(category)) return res.status(400).json({ error: 'Категорія вже існує' });
    db.categories.push(category);
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
        const { name, category, price, description, specs, variants, image, gallery } = req.body;
        
        if (!name || !category || !price) {
            return res.status(400).json({ error: 'Заповніть обов\'язкові поля' });
        }
        
        const newProduct = {
            id: Date.now(),
            name: name.trim(),
            category: category,
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
        console.log('Товар додано:', newProduct.id);
        res.status(201).json(newProduct);
    } catch(e) {
        console.error('Помилка:', e);
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/products/:id', isAdmin, (req, res) => {
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
            updatedAt: new Date().toISOString()
        };
        
        res.json(db.products[idx]);
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
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
app.post('/api/about', isAdmin, (req, res) => { db.about = req.body.text || ''; res.json({ success: true }); });

app.get('/api/contact', (req, res) => res.send(db.contact));
app.post('/api/contact', isAdmin, (req, res) => { db.contact = req.body.text || ''; res.json({ success: true }); });

// ============ СОЦМЕРЕЖІ ============
app.get('/api/social', (req, res) => res.json(db.social));
app.post('/api/social', isAdmin, (req, res) => { db.social = Array.isArray(req.body) ? req.body : []; res.json({ success: true }); });

// ============ НАЛАШТУВАННЯ ============
app.get('/api/settings', (req, res) => res.json(db.settings));
app.post('/api/settings', isAdmin, (req, res) => { db.settings = { ...db.settings, ...req.body }; res.json({ success: true }); });

// ============ ЗОБРАЖЕННЯ ============
app.get('/api/logo', (req, res) => res.send(db.images.logo || ''));
app.post('/api/logo', isAdmin, (req, res) => { db.images.logo = req.body.image || ''; res.json({ path: db.images.logo }); });
app.delete('/api/logo', isAdmin, (req, res) => { db.images.logo = ''; res.json({ success: true }); });

app.get('/api/banner', (req, res) => res.send(db.images.banner || ''));
app.post('/api/banner', isAdmin, (req, res) => { db.images.banner = req.body.image || ''; res.json({ path: db.images.banner }); });
app.delete('/api/banner', isAdmin, (req, res) => { db.images.banner = ''; res.json({ success: true }); });

app.get('/api/brand-logo', (req, res) => res.send(db.images.brandLogo || ''));
app.post('/api/brand-logo', isAdmin, (req, res) => { db.images.brandLogo = req.body.image || ''; res.json({ path: db.images.brandLogo }); });
app.delete('/api/brand-logo', isAdmin, (req, res) => { db.images.brandLogo = ''; res.json({ success: true }); });

app.get('/api/background', (req, res) => res.send(db.images.background || ''));
app.post('/api/background', isAdmin, (req, res) => { db.images.background = req.body.image || ''; res.json({ path: db.images.background }); });
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

// ============ HEALTH CHECK ============
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// ============ СТОРІНКИ ============
app.get('/admin', (req, res) => {
    if (!req.session?.user?.isAdmin) {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ============ ЗАПУСК ============
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n=================================`);
    console.log(`🚀 Сервер запущено на порту: ${PORT}`);
    console.log(`📌 Адмін-панель: /admin`);
    console.log(`👤 Логін: admin / admin`);
    console.log(`=================================\n`);
});
