const express = require('express');
const multer = require('multer');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// База даних в пам'яті
const db = {
    users: [{ username: 'admin', password: 'admin', isAdmin: true }],
    categories: ['Дрони', 'Реб'],
    products: [],
    orders: [],
    social: [],
    reviews: [],
    about: 'Ми — команда професіоналів, яка займається продажем дронів та комплектуючих для FPV.',
    contact: 'Телефон: +380 99 123 45 67\nEmail: info@zahiddrone.com\nГрафік: Пн-Пт 10:00-19:00\nАдреса: м. Львів',
    settings: { product_display_style: 'classic' },
    images: {
        logo: '',
        banner: '',
        brandLogo: '',
        background: ''
    }
};

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(__dirname));

// Сесія
app.use(session({
    secret: 'zahid-dron-secret-key-2025',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true
    }
}));

// Логування
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Multer для зберігання в пам'яті
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Middleware для перевірки адміна
function isAdmin(req, res, next) {
    if (req.session && req.session.user && req.session.user.isAdmin === true) {
        return next();
    }
    res.status(403).json({ error: 'Доступ заборонено' });
}

// ============ Аутентифікація ============
app.get('/api/user', (req, res) => {
    if (req.session && req.session.user) {
        res.json(req.session.user);
    } else {
        res.status(401).json({ error: 'Не авторизований' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = db.users.find(u => u.username === username && u.password === password);
        
        if (user) {
            req.session.user = { username: user.username, isAdmin: user.isAdmin };
            await req.session.save();
            res.json({ username: user.username, isAdmin: user.isAdmin });
        } else {
            res.status(401).json({ error: 'Невірний логін або пароль' });
        }
    } catch (err) { 
        console.error('Login error:', err);
        res.status(500).json({ error: 'Помилка сервера' }); 
    }
});

app.post('/api/logout', (req, res) => { 
    req.session.destroy(() => {
        res.json({ success: true }); 
    });
});

app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Заповніть всі поля' });
        }
        
        if (db.users.find(u => u.username === username)) {
            return res.status(400).json({ error: 'Користувач вже існує' });
        }
        
        db.users.push({ username, password, isAdmin: false });
        res.status(201).json({ success: true });
    } catch (err) { 
        console.error('Register error:', err);
        res.status(500).json({ error: 'Помилка сервера' }); 
    }
});

app.post('/api/admin/change-password', isAdmin, async (req, res) => {
    try {
        const { currentPassword, newUsername, newPassword } = req.body;
        const idx = db.users.findIndex(u => u.username === req.session.user.username);
        
        if (idx === -1) {
            return res.status(404).json({ error: 'Користувача не знайдено' });
        }
        if (db.users[idx].password !== currentPassword) {
            return res.status(401).json({ error: 'Невірний поточний пароль' });
        }
        
        if (newUsername && newUsername.trim()) {
            db.users[idx].username = newUsername;
            req.session.user.username = newUsername;
        }
        if (newPassword && newPassword.trim()) {
            db.users[idx].password = newPassword;
        }
        
        await req.session.save();
        res.json({ success: true });
    } catch (err) { 
        console.error('Change password error:', err);
        res.status(500).json({ error: 'Помилка сервера' }); 
    }
});

// ============ Зображення (base64) ============
app.get('/api/logo', (req, res) => { 
    res.send(db.images.logo || ''); 
});

app.post('/api/logo', isAdmin, upload.single('logo'), async (req, res) => { 
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Файл не завантажено' });
        }
        const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        db.images.logo = base64;
        res.json({ path: base64 });
    } catch(err) {
        console.error('Logo upload error:', err);
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

app.delete('/api/logo', isAdmin, (req, res) => { 
    db.images.logo = '';
    res.json({ success: true });
});

app.get('/api/banner', (req, res) => { 
    res.send(db.images.banner || ''); 
});

app.post('/api/banner', isAdmin, upload.single('banner'), async (req, res) => { 
    try {
        if (!req.file) return res.status(400).json({ error: 'Файл не завантажено' });
        const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        db.images.banner = base64;
        res.json({ path: base64 });
    } catch(err) {
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

app.delete('/api/banner', isAdmin, (req, res) => { 
    db.images.banner = '';
    res.json({ success: true });
});

app.get('/api/brand-logo', (req, res) => { 
    res.send(db.images.brandLogo || ''); 
});

app.post('/api/brand-logo', isAdmin, upload.single('brand-logo'), async (req, res) => { 
    try {
        if (!req.file) return res.status(400).json({ error: 'Файл не завантажено' });
        const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        db.images.brandLogo = base64;
        res.json({ path: base64 });
    } catch(err) {
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

app.delete('/api/brand-logo', isAdmin, (req, res) => { 
    db.images.brandLogo = '';
    res.json({ success: true });
});

app.get('/api/background', (req, res) => { 
    res.send(db.images.background || ''); 
});

app.post('/api/background', isAdmin, upload.single('background'), async (req, res) => { 
    try {
        if (!req.file) return res.status(400).json({ error: 'Файл не завантажено' });
        const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        db.images.background = base64;
        res.json({ path: base64 });
    } catch(err) {
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

app.delete('/api/background', isAdmin, (req, res) => { 
    db.images.background = '';
    res.json({ success: true });
});

// ============ Налаштування ============
app.get('/api/settings', (req, res) => {
    res.json(db.settings);
});

app.post('/api/settings', isAdmin, (req, res) => { 
    db.settings = { ...db.settings, ...req.body };
    res.json({ success: true });
});

// ============ Категорії ============
app.get('/api/categories', (req, res) => { 
    res.json(db.categories); 
});

app.post('/api/categories', isAdmin, (req, res) => {
    const { category } = req.body;
    if (!category || !category.trim()) {
        return res.status(400).json({ error: 'Назва обов\'язкова' });
    }
    if (db.categories.includes(category)) {
        return res.status(400).json({ error: 'Категорія вже існує' });
    }
    db.categories.push(category);
    res.json({ success: true });
});

app.delete('/api/categories/:category', isAdmin, (req, res) => {
    const cat = decodeURIComponent(req.params.category);
    if (db.products.some(p => p.category === cat)) {
        return res.status(400).json({ error: 'Неможливо видалити категорію з товарами' });
    }
    const idx = db.categories.indexOf(cat);
    if (idx === -1) {
        return res.status(404).json({ error: 'Не знайдено' });
    }
    db.categories.splice(idx, 1);
    res.json({ success: true });
});

// ============ Товари ============
app.get('/api/products', (req, res) => { 
    res.json(db.products); 
});

app.post('/api/products', isAdmin, upload.single('image'), (req, res) => {
    try {
        console.log('=== POST /api/products ===');
        
        let variants = ['Стандарт'];
        if (req.body.variants) {
            try {
                variants = JSON.parse(req.body.variants);
            } catch(e) {
                console.log('Помилка парсингу варіантів:', e.message);
            }
        }
        
        if (!req.body.name || !req.body.name.trim()) {
            return res.status(400).json({ error: 'Назва товару обов\'язкова' });
        }
        if (!req.body.category) {
            return res.status(400).json({ error: 'Категорія обов\'язкова' });
        }
        if (!req.body.price || isNaN(parseFloat(req.body.price))) {
            return res.status(400).json({ error: 'Ціна обов\'язкова і має бути числом' });
        }
        
        let image = null;
        if (req.file) {
            image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        }
        
        const newProduct = {
            id: Date.now(),
            name: req.body.name.trim(),
            category: req.body.category,
            price: parseFloat(req.body.price),
            description: req.body.description || '',
            specs: req.body.specs || '',
            variants: variants,
            image: image,
            gallery: [],
            images: [],
            createdAt: new Date().toISOString()
        };
        
        db.products.push(newProduct);
        
        console.log('✅ Товар додано:', newProduct.id);
        res.status(201).json(newProduct);
        
    } catch(e) { 
        console.error('❌ Помилка додавання товару:', e); 
        res.status(500).json({ error: 'Помилка сервера: ' + e.message }); 
    }
});

app.put('/api/products/:id', isAdmin, upload.single('image'), (req, res) => {
    try {
        console.log('=== PUT /api/products/' + req.params.id + ' ===');
        
        const idx = db.products.findIndex(p => p.id == req.params.id);
        
        if (idx === -1) {
            return res.status(404).json({ error: 'Товар не знайдено' });
        }
        
        let variants = db.products[idx].variants || ['Стандарт'];
        if (req.body.variants) {
            try {
                variants = JSON.parse(req.body.variants);
            } catch(e) {
                console.log('Помилка парсингу варіантів:', e.message);
            }
        }
        
        if (!req.body.name || !req.body.name.trim()) {
            return res.status(400).json({ error: 'Назва товару обов\'язкова' });
        }
        if (!req.body.category) {
            return res.status(400).json({ error: 'Категорія обов\'язкова' });
        }
        if (!req.body.price || isNaN(parseFloat(req.body.price))) {
            return res.status(400).json({ error: 'Ціна обов\'язкова і має бути числом' });
        }
        
        let image = db.products[idx].image;
        if (req.file) {
            image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        }
        
        db.products[idx] = {
            ...db.products[idx],
            name: req.body.name.trim(),
            category: req.body.category,
            price: parseFloat(req.body.price),
            description: req.body.description || '',
            specs: req.body.specs || '',
            variants: variants,
            image: image,
            updatedAt: new Date().toISOString()
        };
        
        console.log('✅ Товар оновлено');
        res.json(db.products[idx]);
        
    } catch(e) { 
        console.error('❌ Помилка оновлення товару:', e);
        res.status(500).json({ error: 'Помилка сервера: ' + e.message }); 
    }
});

app.delete('/api/products/:id', isAdmin, (req, res) => {
    const idx = db.products.findIndex(p => p.id == req.params.id);
    if (idx === -1) {
        return res.status(404).json({ error: 'Товар не знайдено' });
    }
    db.products.splice(idx, 1);
    res.json({ success: true });
});

// ============ Відгуки ============
app.get('/api/reviews', (req, res) => {
    res.json(db.reviews);
});

app.post('/api/reviews', (req, res) => {
    const newReview = {
        id: Date.now(),
        ...req.body,
        date: new Date().toISOString()
    };
    db.reviews.push(newReview);
    res.status(201).json(newReview);
});

app.delete('/api/reviews/:id', isAdmin, (req, res) => {
    const idx = db.reviews.findIndex(r => r.id == req.params.id);
    if (idx !== -1) {
        db.reviews.splice(idx, 1);
    }
    res.json({ success: true });
});

// ============ Про нас / Контакти ============
app.get('/api/about', (req, res) => { 
    res.send(db.about); 
});

app.post('/api/about', isAdmin, (req, res) => { 
    db.about = req.body.text;
    res.json({ success: true });
});

app.get('/api/contact', (req, res) => { 
    res.send(db.contact); 
});

app.post('/api/contact', isAdmin, (req, res) => { 
    db.contact = req.body.text;
    res.json({ success: true });
});

// ============ Соцмережі ============
app.get('/api/social', (req, res) => {
    res.json(db.social);
});

app.post('/api/social', isAdmin, (req, res) => { 
    db.social = req.body;
    res.json({ success: true });
});

// ============ Замовлення ============
app.get('/api/orders', isAdmin, (req, res) => { 
    res.json(db.orders); 
});

app.post('/api/orders', (req, res) => {
    const newOrder = { 
        id: Date.now(), 
        ...req.body, 
        date: new Date().toISOString(), 
        status: 'нове' 
    };
    db.orders.push(newOrder);
    res.status(201).json(newOrder);
});

// ============ Статистика ============
app.get('/api/stats', isAdmin, (req, res) => {
    const variantsCount = db.products.reduce((sum, p) => sum + (p.variants?.length || 0), 0);
    res.json({ 
        productsCount: db.products.length, 
        categoriesCount: db.categories.length, 
        ordersCount: db.orders.length,
        variantsCount: variantsCount
    });
});

// ============ Маршрути сторінок ============
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin', (req, res) => {
    if (!req.session || !req.session.user || !req.session.user.isAdmin) {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/catalog', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/reviews', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/contacts', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/product/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n=================================`);
    console.log(`🚀 Сервер запущено на порту: ${PORT}`);
    console.log(`📌 Адмін-панель: /admin`);
    console.log(`👤 Логін: admin, Пароль: admin`);
    console.log(`💾 Дані зберігаються в пам'яті`);
    console.log(`=================================\n`);
});
