const express = require('express');
const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

app.use(session({
    secret: 'zahid-dron-secret-key-2025',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000, httpOnly: true, secure: false }
}));

const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        await fs.mkdir('./uploads', { recursive: true });
        cb(null, './uploads/');
    },
    filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname))
});
const fileFilter = (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|svg/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    cb(null, mime && ext);
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

const DATA_DIR = './data';
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const CATEGORIES_FILE = path.join(DATA_DIR, 'categories.json');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const ABOUT_FILE = path.join(DATA_DIR, 'about.txt');
const CONTACT_FILE = path.join(DATA_DIR, 'contact.txt');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const SOCIAL_FILE = path.join(DATA_DIR, 'social.json');
const LOGO_FILE = path.join(DATA_DIR, 'logo.txt');
const BANNER_FILE = path.join(DATA_DIR, 'banner.txt');
const BRAND_LOGO_FILE = path.join(DATA_DIR, 'brand-logo.txt');
const BACKGROUND_FILE = path.join(DATA_DIR, 'background.txt');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const REVIEWS_FILE = path.join(DATA_DIR, 'reviews.json');

async function initData() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        await fs.mkdir('./uploads', { recursive: true });

        if (!await fs.access(USERS_FILE).then(()=>true).catch(()=>false)) {
            await fs.writeFile(USERS_FILE, JSON.stringify([{ username: 'admin', password: 'admin', isAdmin: true }], null, 2));
        }
        if (!await fs.access(CATEGORIES_FILE).then(()=>true).catch(()=>false)) {
            await fs.writeFile(CATEGORIES_FILE, JSON.stringify(['Дрони', 'Реб'], null, 2));
        }
        if (!await fs.access(PRODUCTS_FILE).then(()=>true).catch(()=>false)) {
            await fs.writeFile(PRODUCTS_FILE, JSON.stringify([
                { id: 1, name: 'Квадрокоптер DJI Mavic 3', category: 'Дрони', price: 85000, description: 'Професійний дрон з камерою Hasselblad', specs: 'Потужність: 30 Вт, 50 Вт\nБатарея: 5000 mAh', variants: ['Standard', 'Pro', 'Cine'], image: null, createdAt: new Date().toISOString() },
                { id: 2, name: 'Карбонові реб 3K', category: 'Реб', price: 1200, description: 'Високоякісні карбонові ребра', specs: 'Матеріал: карбон\nТовщина: 3 мм', variants: ['200mm', '250mm', '300mm'], image: null, createdAt: new Date().toISOString() }
            ], null, 2));
        }
        if (!await fs.access(ABOUT_FILE).then(()=>true).catch(()=>false)) {
            await fs.writeFile(ABOUT_FILE, 'Ми — команда професіоналів, яка займається продажем дронів та реб. Працюємо з 2020 року.');
        }
        if (!await fs.access(CONTACT_FILE).then(()=>true).catch(()=>false)) {
            await fs.writeFile(CONTACT_FILE, 'Телефон: +380 99 123 45 67\nEmail: info@zahidron.ua\nГрафік: Пн-Пт 10:00-19:00\nАдреса: м. Львів, вул. Прикладна 1');
        }
        if (!await fs.access(ORDERS_FILE).then(()=>true).catch(()=>false)) {
            await fs.writeFile(ORDERS_FILE, JSON.stringify([], null, 2));
        }
        if (!await fs.access(SOCIAL_FILE).then(()=>true).catch(()=>false)) {
            await fs.writeFile(SOCIAL_FILE, JSON.stringify([
                { platform: 'telegram', url: 'https://t.me/zahid_dron', icon: 'fa-brands fa-telegram', name: 'Telegram', active: true },
                { platform: 'instagram', url: 'https://instagram.com/zahid_dron', icon: 'fa-brands fa-instagram', name: 'Instagram', active: true }
            ], null, 2));
        }
        if (!await fs.access(LOGO_FILE).then(()=>true).catch(()=>false)) await fs.writeFile(LOGO_FILE, '');
        if (!await fs.access(BANNER_FILE).then(()=>true).catch(()=>false)) await fs.writeFile(BANNER_FILE, '');
        if (!await fs.access(BRAND_LOGO_FILE).then(()=>true).catch(()=>false)) await fs.writeFile(BRAND_LOGO_FILE, '');
        if (!await fs.access(BACKGROUND_FILE).then(()=>true).catch(()=>false)) await fs.writeFile(BACKGROUND_FILE, '');
        if (!await fs.access(SETTINGS_FILE).then(()=>true).catch(()=>false)) await fs.writeFile(SETTINGS_FILE, JSON.stringify({ product_display_style: 'classic' }, null, 2));
        if (!await fs.access(REVIEWS_FILE).then(()=>true).catch(()=>false)) await fs.writeFile(REVIEWS_FILE, JSON.stringify([], null, 2));
        console.log('✅ Ініціалізацію даних завершено');
    } catch (err) { console.error('❌ Помилка ініціалізації:', err); }
}
initData();

function isAdmin(req, res, next) {
    if (req.session.user?.isAdmin) return next();
    res.status(403).json({ error: 'Доступ заборонено' });
}

// ============ API Routes ============
app.get('/api/user', (req, res) => {
    if (req.session.user) res.json(req.session.user);
    else res.status(401).json({ error: 'Не авторизований' });
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const users = JSON.parse(await fs.readFile(USERS_FILE, 'utf8'));
        const user = users.find(u => u.username === username && u.password === password);
        if (user) {
            req.session.user = { username: user.username, isAdmin: user.isAdmin };
            res.json({ username: user.username, isAdmin: user.isAdmin });
        } else res.status(401).json({ error: 'Невірний логін або пароль' });
    } catch (err) { res.status(500).json({ error: 'Помилка сервера' }); }
});

app.post('/api/logout', (req, res) => { req.session.destroy(); res.json({ success: true }); });

app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Заповніть всі поля' });
        const users = JSON.parse(await fs.readFile(USERS_FILE, 'utf8'));
        if (users.find(u => u.username === username)) return res.status(400).json({ error: 'Користувач вже існує' });
        users.push({ username, password, isAdmin: false });
        await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
        res.status(201).json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Помилка сервера' }); }
});

app.post('/api/admin/change-password', isAdmin, async (req, res) => {
    try {
        const { currentPassword, newUsername, newPassword } = req.body;
        const users = JSON.parse(await fs.readFile(USERS_FILE, 'utf8'));
        const idx = users.findIndex(u => u.username === req.session.user.username);
        if (idx === -1) return res.status(404).json({ error: 'Користувача не знайдено' });
        if (users[idx].password !== currentPassword) return res.status(401).json({ error: 'Невірний поточний пароль' });
        if (newUsername && newUsername.trim()) {
            if (users.some(u => u.username === newUsername && u.username !== req.session.user.username))
                return res.status(400).json({ error: 'Логін вже зайнятий' });
            users[idx].username = newUsername;
        }
        if (newPassword && newPassword.trim()) {
            if (newPassword.length < 6) return res.status(400).json({ error: 'Пароль має бути не менше 6 символів' });
            users[idx].password = newPassword;
        }
        await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
        // Не знищуємо сесію, щоб не викидало з акаунту
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Помилка сервера' }); }
});

// Зображення
app.get('/api/logo', async (req, res) => { try { const p = await fs.readFile(LOGO_FILE, 'utf8'); res.send(p || ''); } catch(e){res.send('');} });
app.post('/api/logo', isAdmin, upload.single('logo'), async (req, res) => { if (!req.file) return res.status(400).json({ error: 'Файл не завантажено' }); const p = `/uploads/${req.file.filename}`; await fs.writeFile(LOGO_FILE, p); res.json({ path: p }); });
app.delete('/api/logo', isAdmin, async (req, res) => { await fs.writeFile(LOGO_FILE, ''); res.json({ success: true }); });

app.get('/api/banner', async (req, res) => { try { const p = await fs.readFile(BANNER_FILE, 'utf8'); res.send(p || ''); } catch(e){res.send('');} });
app.post('/api/banner', isAdmin, upload.single('banner'), async (req, res) => { if (!req.file) return res.status(400).json({ error: 'Файл не завантажено' }); const p = `/uploads/${req.file.filename}`; await fs.writeFile(BANNER_FILE, p); res.json({ path: p }); });
app.delete('/api/banner', isAdmin, async (req, res) => { await fs.writeFile(BANNER_FILE, ''); res.json({ success: true }); });

app.get('/api/brand-logo', async (req, res) => { try { const p = await fs.readFile(BRAND_LOGO_FILE, 'utf8'); res.send(p || ''); } catch(e){res.send('');} });
app.post('/api/brand-logo', isAdmin, upload.single('brand-logo'), async (req, res) => { if (!req.file) return res.status(400).json({ error: 'Файл не завантажено' }); const p = `/uploads/${req.file.filename}`; await fs.writeFile(BRAND_LOGO_FILE, p); res.json({ path: p }); });
app.delete('/api/brand-logo', isAdmin, async (req, res) => { await fs.writeFile(BRAND_LOGO_FILE, ''); res.json({ success: true }); });

app.get('/api/background', async (req, res) => { try { const p = await fs.readFile(BACKGROUND_FILE, 'utf8'); res.send(p || ''); } catch(e){res.send('');} });
app.post('/api/background', isAdmin, upload.single('background'), async (req, res) => { if (!req.file) return res.status(400).json({ error: 'Файл не завантажено' }); const p = `/uploads/${req.file.filename}`; await fs.writeFile(BACKGROUND_FILE, p); res.json({ path: p }); });
app.delete('/api/background', isAdmin, async (req, res) => { await fs.writeFile(BACKGROUND_FILE, ''); res.json({ success: true }); });

// Налаштування
app.get('/api/settings', async (req, res) => {
    try { const s = JSON.parse(await fs.readFile(SETTINGS_FILE, 'utf8')); res.json(s); } catch(e) { res.json({ product_display_style: 'classic' }); }
});
app.post('/api/settings', isAdmin, async (req, res) => { await fs.writeFile(SETTINGS_FILE, JSON.stringify(req.body, null, 2)); res.json({ success: true }); });

// Відгуки
app.get('/api/reviews', async (req, res) => {
    try { const r = JSON.parse(await fs.readFile(REVIEWS_FILE, 'utf8')); res.json(r); } catch(e) { res.json([]); }
});
app.post('/api/reviews', async (req, res) => {
    try {
        const { author, rating, text } = req.body;
        if (!author || !text) return res.status(400).json({ error: 'Заповніть всі поля' });
        const reviews = JSON.parse(await fs.readFile(REVIEWS_FILE, 'utf8'));
        const newReview = { id: Date.now(), author, rating: rating || 5, text, date: new Date().toISOString(), approved: true };
        reviews.push(newReview);
        await fs.writeFile(REVIEWS_FILE, JSON.stringify(reviews, null, 2));
        res.status(201).json(newReview);
    } catch(e) { res.status(500).json({ error: 'Помилка' }); }
});
app.delete('/api/reviews/:id', isAdmin, async (req, res) => {
    try {
        const reviews = JSON.parse(await fs.readFile(REVIEWS_FILE, 'utf8'));
        const filtered = reviews.filter(r => r.id != req.params.id);
        await fs.writeFile(REVIEWS_FILE, JSON.stringify(filtered, null, 2));
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'Помилка' }); }
});

// Категорії
app.get('/api/categories', async (req, res) => { try { const c = JSON.parse(await fs.readFile(CATEGORIES_FILE, 'utf8')); res.json(c); } catch(e){res.status(500).json({error:'Помилка'});} });
app.post('/api/categories', isAdmin, async (req, res) => {
    const { category } = req.body;
    if (!category || !category.trim()) return res.status(400).json({ error: 'Назва обов\'язкова' });
    const cats = JSON.parse(await fs.readFile(CATEGORIES_FILE, 'utf8'));
    if (cats.includes(category)) return res.status(400).json({ error: 'Категорія вже існує' });
    cats.push(category);
    await fs.writeFile(CATEGORIES_FILE, JSON.stringify(cats, null, 2));
    res.json({ success: true });
});
app.delete('/api/categories/:category', isAdmin, async (req, res) => {
    const cat = decodeURIComponent(req.params.category);
    const cats = JSON.parse(await fs.readFile(CATEGORIES_FILE, 'utf8'));
    const prods = JSON.parse(await fs.readFile(PRODUCTS_FILE, 'utf8'));
    if (prods.some(p => p.category === cat)) return res.status(400).json({ error: 'Неможливо видалити категорію з товарами' });
    const idx = cats.indexOf(cat);
    if (idx === -1) return res.status(404).json({ error: 'Не знайдено' });
    cats.splice(idx, 1);
    await fs.writeFile(CATEGORIES_FILE, JSON.stringify(cats, null, 2));
    res.json({ success: true });
});

// Товари
app.get('/api/products', async (req, res) => { try { const p = JSON.parse(await fs.readFile(PRODUCTS_FILE, 'utf8')); res.json(p); } catch(e){res.status(500).json({error:'Помилка'});} });
app.post('/api/products', isAdmin, upload.single('image'), async (req, res) => {
    try {
        const products = JSON.parse(await fs.readFile(PRODUCTS_FILE, 'utf8'));
        const variants = JSON.parse(req.body.variants || '[]');
        if (!req.body.name?.trim() || !req.body.category || !req.body.price) return res.status(400).json({ error: 'Заповніть обов\'язкові поля' });
        const newProduct = {
            id: Date.now(),
            name: req.body.name.trim(),
            category: req.body.category,
            price: parseFloat(req.body.price),
            description: req.body.description || '',
            specs: req.body.specs || '',
            variants: variants.length ? variants : ['Стандарт'],
            image: req.file ? `/uploads/${req.file.filename}` : null,
            createdAt: new Date().toISOString()
        };
        products.push(newProduct);
        await fs.writeFile(PRODUCTS_FILE, JSON.stringify(products, null, 2));
        res.status(201).json(newProduct);
    } catch(e){ res.status(500).json({ error: 'Помилка сервера' }); }
});
app.delete('/api/products/:id', isAdmin, async (req, res) => {
    const products = JSON.parse(await fs.readFile(PRODUCTS_FILE, 'utf8'));
    const idx = products.findIndex(p => p.id == req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Товар не знайдено' });
    if (products[idx].image) {
        try { await fs.unlink(path.join(__dirname, products[idx].image)); } catch(e){}
    }
    products.splice(idx, 1);
    await fs.writeFile(PRODUCTS_FILE, JSON.stringify(products, null, 2));
    res.json({ success: true });
});
app.delete('/api/products/:id/variant/:index', isAdmin, async (req, res) => {
    const products = JSON.parse(await fs.readFile(PRODUCTS_FILE, 'utf8'));
    const p = products.find(p => p.id == req.params.id);
    if (!p) return res.status(404).json({ error: 'Товар не знайдено' });
    const idx = parseInt(req.params.index);
    if (idx < 0 || idx >= p.variants.length) return res.status(404).json({ error: 'Варіант не знайдено' });
    p.variants.splice(idx, 1);
    await fs.writeFile(PRODUCTS_FILE, JSON.stringify(products, null, 2));
    res.json({ success: true });
});

// Про нас
app.get('/api/about', async (req, res) => { try { const t = await fs.readFile(ABOUT_FILE, 'utf8'); res.send(t); } catch(e){res.send('');} });
app.post('/api/about', isAdmin, async (req, res) => { await fs.writeFile(ABOUT_FILE, req.body.text); res.json({ success: true }); });

// Контакти
app.get('/api/contact', async (req, res) => { try { const t = await fs.readFile(CONTACT_FILE, 'utf8'); res.send(t); } catch(e){res.send('');} });
app.post('/api/contact', isAdmin, async (req, res) => { await fs.writeFile(CONTACT_FILE, req.body.text); res.json({ success: true }); });

// Соціальні мережі
app.get('/api/social', async (req, res) => {
    const s = JSON.parse(await fs.readFile(SOCIAL_FILE, 'utf8'));
    if (!req.session.user?.isAdmin) res.json(s.filter(si => si.active));
    else res.json(s);
});
app.post('/api/social', isAdmin, async (req, res) => { await fs.writeFile(SOCIAL_FILE, JSON.stringify(req.body, null, 2)); res.json({ success: true }); });

// Замовлення
app.get('/api/orders', isAdmin, async (req, res) => { const o = JSON.parse(await fs.readFile(ORDERS_FILE, 'utf8')); res.json(o); });
app.post('/api/orders', async (req, res) => {
    const orders = JSON.parse(await fs.readFile(ORDERS_FILE, 'utf8'));
    const newOrder = { id: Date.now(), ...req.body, date: new Date().toISOString(), status: 'нове' };
    orders.push(newOrder);
    await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2));
    res.status(201).json(newOrder);
});

// Статистика
app.get('/api/stats', isAdmin, async (req, res) => {
    const products = JSON.parse(await fs.readFile(PRODUCTS_FILE, 'utf8'));
    const categories = JSON.parse(await fs.readFile(CATEGORIES_FILE, 'utf8'));
    const orders = JSON.parse(await fs.readFile(ORDERS_FILE, 'utf8'));
    const totalSum = orders.reduce((sum, o) => { const p = products.find(p => p.id == o.productId); return sum + (p?.price || 0); }, 0);
    const variantsCount = products.reduce((a, p) => a + p.variants.length, 0);
    res.json({ productsCount: products.length, categoriesCount: categories.length, ordersCount: orders.length, totalOrdersSum: totalSum, variantsCount });
});

// Сторінки
app.get('/admin', (req, res) => {
    if (!req.session.user?.isAdmin) return res.redirect('/');
    res.sendFile(path.join(__dirname, 'admin.html'));
});
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n=================================\n🚀 Сервер запущено: http://localhost:${PORT}\n📌 Адмін-панель: http://localhost:${PORT}/admin\n👤 Логін: admin, Пароль: admin\n=================================\n`);
});
