const express = require('express');
const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

// Збільшуємо ліміти для JSON
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(__dirname));
app.use('/uploads', express.static('uploads'));

// НАЛАШТУВАННЯ СЕСІЇ
app.use(session({
    secret: 'zahid-dron-secret-key-2025',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true
    }
}));

// Middleware для логування
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Налаштування multer
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        try {
            await fs.mkdir('./uploads', { recursive: true });
            cb(null, './uploads/');
        } catch(err) {
            cb(err);
        }
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({ 
    storage, 
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

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

        // Створюємо файли якщо їх немає
        const files = [
            [USERS_FILE, JSON.stringify([{ username: 'admin', password: 'admin', isAdmin: true }], null, 2)],
            [CATEGORIES_FILE, JSON.stringify(['Дрони', 'Реб'], null, 2)],
            [PRODUCTS_FILE, JSON.stringify([], null, 2)],
            [ABOUT_FILE, 'Ми — команда професіоналів, яка займається продажем дронів та реб.'],
            [CONTACT_FILE, 'Телефон: +380 99 123 45 67\nEmail: info@zahidron.ua\nГрафік: Пн-Пт 10:00-19:00\nАдреса: м. Львів'],
            [ORDERS_FILE, JSON.stringify([], null, 2)],
            [SOCIAL_FILE, JSON.stringify([], null, 2)],
            [LOGO_FILE, ''],
            [BANNER_FILE, ''],
            [BRAND_LOGO_FILE, ''],
            [BACKGROUND_FILE, ''],
            [SETTINGS_FILE, JSON.stringify({ product_display_style: 'classic' }, null, 2)],
            [REVIEWS_FILE, JSON.stringify([], null, 2)]
        ];

        for (const [filePath, content] of files) {
            try {
                await fs.access(filePath);
            } catch {
                await fs.writeFile(filePath, content);
                console.log('✅ Створено:', path.basename(filePath));
            }
        }
        
        console.log('✅ Ініціалізацію даних завершено');
    } catch (err) { 
        console.error('❌ Помилка ініціалізації:', err); 
    }
}

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
        const users = JSON.parse(await fs.readFile(USERS_FILE, 'utf8'));
        const user = users.find(u => u.username === username && u.password === password);
        
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
        
        const users = JSON.parse(await fs.readFile(USERS_FILE, 'utf8'));
        if (users.find(u => u.username === username)) {
            return res.status(400).json({ error: 'Користувач вже існує' });
        }
        
        users.push({ username, password, isAdmin: false });
        await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
        res.status(201).json({ success: true });
    } catch (err) { 
        console.error('Register error:', err);
        res.status(500).json({ error: 'Помилка сервера' }); 
    }
});

app.post('/api/admin/change-password', isAdmin, async (req, res) => {
    try {
        const { currentPassword, newUsername, newPassword } = req.body;
        const users = JSON.parse(await fs.readFile(USERS_FILE, 'utf8'));
        const idx = users.findIndex(u => u.username === req.session.user.username);
        
        if (idx === -1) {
            return res.status(404).json({ error: 'Користувача не знайдено' });
        }
        if (users[idx].password !== currentPassword) {
            return res.status(401).json({ error: 'Невірний поточний пароль' });
        }
        
        if (newUsername && newUsername.trim()) {
            users[idx].username = newUsername;
            req.session.user.username = newUsername;
        }
        if (newPassword && newPassword.trim()) {
            users[idx].password = newPassword;
        }
        
        await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
        await req.session.save();
        res.json({ success: true });
    } catch (err) { 
        console.error('Change password error:', err);
        res.status(500).json({ error: 'Помилка сервера' }); 
    }
});

// ============ Зображення ============
app.get('/api/logo', async (req, res) => { 
    try { 
        const p = await fs.readFile(LOGO_FILE, 'utf8'); 
        res.send(p || ''); 
    } catch(e) { 
        res.send(''); 
    } 
});

app.post('/api/logo', isAdmin, upload.single('logo'), async (req, res) => { 
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Файл не завантажено' });
        }
        const p = `/uploads/${req.file.filename}`; 
        await fs.writeFile(LOGO_FILE, p); 
        res.json({ path: p });
    } catch(err) {
        console.error('Logo upload error:', err);
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

app.delete('/api/logo', isAdmin, async (req, res) => { 
    try {
        await fs.writeFile(LOGO_FILE, ''); 
        res.json({ success: true });
    } catch(err) {
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

app.get('/api/banner', async (req, res) => { 
    try { const p = await fs.readFile(BANNER_FILE, 'utf8'); res.send(p || ''); } 
    catch(e) { res.send(''); } 
});

app.post('/api/banner', isAdmin, upload.single('banner'), async (req, res) => { 
    try {
        if (!req.file) return res.status(400).json({ error: 'Файл не завантажено' }); 
        const p = `/uploads/${req.file.filename}`; 
        await fs.writeFile(BANNER_FILE, p); 
        res.json({ path: p });
    } catch(err) {
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

app.delete('/api/banner', isAdmin, async (req, res) => { 
    try {
        await fs.writeFile(BANNER_FILE, ''); 
        res.json({ success: true });
    } catch(err) {
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

app.get('/api/brand-logo', async (req, res) => { 
    try { const p = await fs.readFile(BRAND_LOGO_FILE, 'utf8'); res.send(p || ''); } 
    catch(e) { res.send(''); } 
});

app.post('/api/brand-logo', isAdmin, upload.single('brand-logo'), async (req, res) => { 
    try {
        if (!req.file) return res.status(400).json({ error: 'Файл не завантажено' }); 
        const p = `/uploads/${req.file.filename}`; 
        await fs.writeFile(BRAND_LOGO_FILE, p); 
        res.json({ path: p });
    } catch(err) {
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

app.delete('/api/brand-logo', isAdmin, async (req, res) => { 
    try {
        await fs.writeFile(BRAND_LOGO_FILE, ''); 
        res.json({ success: true });
    } catch(err) {
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

app.get('/api/background', async (req, res) => { 
    try { const p = await fs.readFile(BACKGROUND_FILE, 'utf8'); res.send(p || ''); } 
    catch(e) { res.send(''); } 
});

app.post('/api/background', isAdmin, upload.single('background'), async (req, res) => { 
    try {
        if (!req.file) return res.status(400).json({ error: 'Файл не завантажено' }); 
        const p = `/uploads/${req.file.filename}`; 
        await fs.writeFile(BACKGROUND_FILE, p); 
        res.json({ path: p });
    } catch(err) {
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

app.delete('/api/background', isAdmin, async (req, res) => { 
    try {
        await fs.writeFile(BACKGROUND_FILE, ''); 
        res.json({ success: true });
    } catch(err) {
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

app.get('/api/settings', async (req, res) => {
    try { 
        const s = JSON.parse(await fs.readFile(SETTINGS_FILE, 'utf8')); 
        res.json(s); 
    } catch(e) { 
        res.json({ product_display_style: 'classic' }); 
    }
});

app.post('/api/settings', isAdmin, async (req, res) => { 
    try {
        await fs.writeFile(SETTINGS_FILE, JSON.stringify(req.body, null, 2)); 
        res.json({ success: true });
    } catch(err) {
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

// ============ Категорії ============
app.get('/api/categories', async (req, res) => { 
    try { 
        const c = JSON.parse(await fs.readFile(CATEGORIES_FILE, 'utf8')); 
        res.json(c); 
    } catch(e) { 
        res.status(500).json({ error: 'Помилка' }); 
    } 
});

app.post('/api/categories', isAdmin, async (req, res) => {
    try {
        const { category } = req.body;
        if (!category || !category.trim()) {
            return res.status(400).json({ error: 'Назва обов\'язкова' });
        }
        const cats = JSON.parse(await fs.readFile(CATEGORIES_FILE, 'utf8'));
        if (cats.includes(category)) {
            return res.status(400).json({ error: 'Категорія вже існує' });
        }
        cats.push(category);
        await fs.writeFile(CATEGORIES_FILE, JSON.stringify(cats, null, 2));
        res.json({ success: true });
    } catch(err) {
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

app.delete('/api/categories/:category', isAdmin, async (req, res) => {
    try {
        const cat = decodeURIComponent(req.params.category);
        const cats = JSON.parse(await fs.readFile(CATEGORIES_FILE, 'utf8'));
        const prods = JSON.parse(await fs.readFile(PRODUCTS_FILE, 'utf8'));
        
        if (prods.some(p => p.category === cat)) {
            return res.status(400).json({ error: 'Неможливо видалити категорію з товарами' });
        }
        
        const idx = cats.indexOf(cat);
        if (idx === -1) {
            return res.status(404).json({ error: 'Не знайдено' });
        }
        
        cats.splice(idx, 1);
        await fs.writeFile(CATEGORIES_FILE, JSON.stringify(cats, null, 2));
        res.json({ success: true });
    } catch(err) {
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

// ============ Товари ============
app.get('/api/products', async (req, res) => { 
    try { 
        const p = JSON.parse(await fs.readFile(PRODUCTS_FILE, 'utf8')); 
        res.json(p); 
    } catch(e) { 
        res.status(500).json({ error: 'Помилка' }); 
    } 
});

app.post('/api/products', isAdmin, upload.single('image'), async (req, res) => {
    try {
        console.log('=== POST /api/products ===');
        
        const products = JSON.parse(await fs.readFile(PRODUCTS_FILE, 'utf8'));
        
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
        
        const newProduct = {
            id: Date.now(),
            name: req.body.name.trim(),
            category: req.body.category,
            price: parseFloat(req.body.price),
            description: req.body.description || '',
            specs: req.body.specs || '',
            variants: variants,
            image: req.file ? `/uploads/${req.file.filename}` : null,
            gallery: [],
            images: [],
            createdAt: new Date().toISOString()
        };
        
        products.push(newProduct);
        await fs.writeFile(PRODUCTS_FILE, JSON.stringify(products, null, 2));
        
        console.log('✅ Товар додано:', newProduct.id);
        res.status(201).json(newProduct);
        
    } catch(e) { 
        console.error('❌ Помилка додавання товару:', e); 
        res.status(500).json({ error: 'Помилка сервера: ' + e.message }); 
    }
});

app.put('/api/products/:id', isAdmin, upload.single('image'), async (req, res) => {
    try {
        console.log('=== PUT /api/products/' + req.params.id + ' ===');
        
        const products = JSON.parse(await fs.readFile(PRODUCTS_FILE, 'utf8'));
        const idx = products.findIndex(p => p.id == req.params.id);
        
        if (idx === -1) {
            return res.status(404).json({ error: 'Товар не знайдено' });
        }
        
        let variants = products[idx].variants || ['Стандарт'];
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
        
        let mainImage = products[idx].image;
        if (req.file) {
            if (mainImage) { 
                try { 
                    await fs.unlink(path.join(__dirname, mainImage)); 
                } catch(e) {
                    console.log('Не вдалося видалити старе зображення');
                } 
            }
            mainImage = `/uploads/${req.file.filename}`;
        }
        
        products[idx] = {
            ...products[idx],
            name: req.body.name.trim(),
            category: req.body.category,
            price: parseFloat(req.body.price),
            description: req.body.description || '',
            specs: req.body.specs || '',
            variants: variants,
            image: mainImage,
            updatedAt: new Date().toISOString()
        };
        
        await fs.writeFile(PRODUCTS_FILE, JSON.stringify(products, null, 2));
        
        console.log('✅ Товар оновлено');
        res.json(products[idx]);
        
    } catch(e) { 
        console.error('❌ Помилка оновлення товару:', e);
        res.status(500).json({ error: 'Помилка сервера: ' + e.message }); 
    }
});

app.delete('/api/products/:id', isAdmin, async (req, res) => {
    try {
        const products = JSON.parse(await fs.readFile(PRODUCTS_FILE, 'utf8'));
        const idx = products.findIndex(p => p.id == req.params.id);
        
        if (idx === -1) {
            return res.status(404).json({ error: 'Товар не знайдено' });
        }
        
        const product = products[idx];
        if (product.image) {
            try { 
                await fs.unlink(path.join(__dirname, product.image)); 
            } catch(e) {}
        }
        
        products.splice(idx, 1);
        await fs.writeFile(PRODUCTS_FILE, JSON.stringify(products, null, 2));
        res.json({ success: true });
    } catch(e) {
        console.error('Delete error:', e);
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

// ============ Відгуки ============
app.get('/api/reviews', async (req, res) => {
    try { 
        const r = JSON.parse(await fs.readFile(REVIEWS_FILE, 'utf8')); 
        res.json(r); 
    } catch(e) { 
        res.json([]); 
    }
});

app.post('/api/reviews', async (req, res) => {
    try {
        const reviews = JSON.parse(await fs.readFile(REVIEWS_FILE, 'utf8'));
        const newReview = {
            id: Date.now(),
            ...req.body,
            date: new Date().toISOString()
        };
        reviews.push(newReview);
        await fs.writeFile(REVIEWS_FILE, JSON.stringify(reviews, null, 2));
        res.status(201).json(newReview);
    } catch(e) {
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

app.delete('/api/reviews/:id', isAdmin, async (req, res) => {
    try {
        const reviews = JSON.parse(await fs.readFile(REVIEWS_FILE, 'utf8'));
        const filtered = reviews.filter(r => r.id != req.params.id);
        await fs.writeFile(REVIEWS_FILE, JSON.stringify(filtered, null, 2));
        res.json({ success: true });
    } catch(e) {
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

// ============ Інші API ============
app.get('/api/about', async (req, res) => { 
    try { const t = await fs.readFile(ABOUT_FILE, 'utf8'); res.send(t); } 
    catch(e) { res.send(''); } 
});

app.post('/api/about', isAdmin, async (req, res) => { 
    try {
        await fs.writeFile(ABOUT_FILE, req.body.text); 
        res.json({ success: true });
    } catch(e) {
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

app.get('/api/contact', async (req, res) => { 
    try { const t = await fs.readFile(CONTACT_FILE, 'utf8'); res.send(t); } 
    catch(e) { res.send(''); } 
});

app.post('/api/contact', isAdmin, async (req, res) => { 
    try {
        await fs.writeFile(CONTACT_FILE, req.body.text); 
        res.json({ success: true });
    } catch(e) {
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

app.get('/api/social', async (req, res) => {
    try { const s = JSON.parse(await fs.readFile(SOCIAL_FILE, 'utf8')); res.json(s); } 
    catch(e) { res.json([]); }
});

app.post('/api/social', isAdmin, async (req, res) => { 
    try {
        await fs.writeFile(SOCIAL_FILE, JSON.stringify(req.body, null, 2)); 
        res.json({ success: true });
    } catch(e) {
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

app.get('/api/orders', isAdmin, async (req, res) => { 
    try { const o = JSON.parse(await fs.readFile(ORDERS_FILE, 'utf8')); res.json(o); } 
    catch(e) { res.json([]); } 
});

app.post('/api/orders', async (req, res) => {
    try {
        const orders = JSON.parse(await fs.readFile(ORDERS_FILE, 'utf8'));
        const newOrder = { 
            id: Date.now(), 
            ...req.body, 
            date: new Date().toISOString(), 
            status: 'нове' 
        };
        orders.push(newOrder);
        await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2));
        res.status(201).json(newOrder);
    } catch(e) {
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

app.get('/api/stats', isAdmin, async (req, res) => {
    try {
        const products = JSON.parse(await fs.readFile(PRODUCTS_FILE, 'utf8'));
        const categories = JSON.parse(await fs.readFile(CATEGORIES_FILE, 'utf8'));
        const orders = JSON.parse(await fs.readFile(ORDERS_FILE, 'utf8'));
        const variantsCount = products.reduce((sum, p) => sum + (p.variants?.length || 0), 0);
        
        res.json({ 
            productsCount: products.length, 
            categoriesCount: categories.length, 
            ordersCount: orders.length,
            variantsCount: variantsCount
        });
    } catch(e) {
        res.status(500).json({ error: 'Помилка сервера' });
    }
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
initData().then(() => {
    app.listen(PORT, () => {
        console.log(`\n=================================`);
        console.log(`🚀 Сервер запущено: http://localhost:${PORT}`);
        console.log(`📌 Адмін-панель: http://localhost:${PORT}/admin`);
        console.log(`👤 Логін: admin, Пароль: admin`);
        console.log(`=================================\n`);
    });
});
