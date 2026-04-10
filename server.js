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

// НАЛАШТУВАННЯ СЕСІЇ
app.use(session({
    secret: 'zahid-dron-secret-key-2025',
    resave: true,
    saveUninitialized: true,
    cookie: { 
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: false,
        sameSite: 'lax'
    }
}));

// Middleware для логування сесії
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log('Session ID:', req.sessionID);
    console.log('Session user:', req.session.user);
    next();
});

// Налаштування multer для обробки масиву файлів
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

// Multer для обробки декількох файлів галереї
const uploadGallery = multer({ 
    storage, 
    fileFilter, 
    limits: { fileSize: 10 * 1024 * 1024 } 
}).array('gallery', 10); // Максимум 10 зображень

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
            console.log('✅ Створено users.json');
        }
        if (!await fs.access(CATEGORIES_FILE).then(()=>true).catch(()=>false)) {
            await fs.writeFile(CATEGORIES_FILE, JSON.stringify(['Дрони', 'Реб'], null, 2));
        }
        if (!await fs.access(PRODUCTS_FILE).then(()=>true).catch(()=>false)) {
            await fs.writeFile(PRODUCTS_FILE, JSON.stringify([], null, 2));
        }
        if (!await fs.access(ABOUT_FILE).then(()=>true).catch(()=>false)) {
            await fs.writeFile(ABOUT_FILE, 'Ми — команда професіоналів, яка займається продажем дронів та реб.');
        }
        if (!await fs.access(CONTACT_FILE).then(()=>true).catch(()=>false)) {
            await fs.writeFile(CONTACT_FILE, 'Телефон: +380 99 123 45 67\nEmail: info@zahidron.ua\nГрафік: Пн-Пт 10:00-19:00');
        }
        if (!await fs.access(ORDERS_FILE).then(()=>true).catch(()=>false)) {
            await fs.writeFile(ORDERS_FILE, JSON.stringify([], null, 2));
        }
        if (!await fs.access(SOCIAL_FILE).then(()=>true).catch(()=>false)) {
            await fs.writeFile(SOCIAL_FILE, JSON.stringify([], null, 2));
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
    console.log('=== isAdmin check ===');
    console.log('Session user:', req.session.user);
    if (req.session.user && req.session.user.isAdmin === true) {
        console.log('✅ Адмін авторизований');
        return next();
    }
    console.log('❌ Доступ заборонено');
    res.status(403).json({ error: 'Доступ заборонено' });
}

// ============ Аутентифікація ============
app.get('/api/user', (req, res) => {
    if (req.session.user) {
        res.json(req.session.user);
    } else {
        res.status(401).json({ error: 'Не авторизований' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log('Login attempt:', username);
        const users = JSON.parse(await fs.readFile(USERS_FILE, 'utf8'));
        const user = users.find(u => u.username === username && u.password === password);
        if (user) {
            req.session.user = { username: user.username, isAdmin: user.isAdmin };
            req.session.save();
            console.log('Login successful, session saved:', req.session.user);
            res.json({ username: user.username, isAdmin: user.isAdmin });
        } else {
            console.log('Login failed');
            res.status(401).json({ error: 'Невірний логін або пароль' });
        }
    } catch (err) { 
        console.error('Login error:', err);
        res.status(500).json({ error: 'Помилка сервера' }); 
    }
});

app.post('/api/logout', (req, res) => { 
    req.session.destroy(); 
    res.json({ success: true }); 
});

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
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Помилка сервера' }); }
});

// ============ Зображення ============
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

app.get('/api/settings', async (req, res) => {
    try { const s = JSON.parse(await fs.readFile(SETTINGS_FILE, 'utf8')); res.json(s); } catch(e) { res.json({ product_display_style: 'classic' }); }
});
app.post('/api/settings', isAdmin, async (req, res) => { await fs.writeFile(SETTINGS_FILE, JSON.stringify(req.body, null, 2)); res.json({ success: true }); });

// ============ Категорії ============
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

// ============ Товари з підтримкою галереї ============
app.get('/api/products', async (req, res) => { 
    try { 
        const p = JSON.parse(await fs.readFile(PRODUCTS_FILE, 'utf8')); 
        res.json(p); 
    } catch(e){
        res.status(500).json({error:'Помилка'});
    } 
});

app.post('/api/products', isAdmin, (req, res) => {
    // Використовуємо uploadGallery для обробки декількох файлів
    uploadGallery(req, res, async (err) => {
        if (err) {
            console.error('Upload error:', err);
            return res.status(400).json({ error: 'Помилка завантаження файлів' });
        }
        
        try {
            console.log('Додавання товару адміном:', req.session.user);
            console.log('Body:', req.body);
            console.log('Files:', req.files);
            
            const products = JSON.parse(await fs.readFile(PRODUCTS_FILE, 'utf8'));
            const variants = JSON.parse(req.body.variants || '[]');
            
            if (!req.body.name?.trim() || !req.body.category || !req.body.price) {
                return res.status(400).json({ error: 'Заповніть обов\'язкові поля' });
            }
            
            // Обробка головного зображення
            let mainImage = null;
            if (req.files && req.files.length > 0) {
                // Шукаємо файл з fieldname 'image' або перший файл
                const mainFile = req.files.find(f => f.fieldname === 'image') || req.files[0];
                mainImage = `/uploads/${mainFile.filename}`;
            }
            
            // Обробка галереї
            const galleryImages = [];
            if (req.files && req.files.length > 0) {
                // Фільтруємо файли галереї (fieldname починається з 'gallery_')
                const galleryFiles = req.files.filter(f => f.fieldname.startsWith('gallery_'));
                galleryFiles.forEach(file => {
                    galleryImages.push({
                        id: Date.now() + Math.random(),
                        url: `/uploads/${file.filename}`,
                        isMain: false
                    });
                });
            }
            
            // Парсимо існуючі зображення галереї
            let existingGallery = [];
            if (req.body.gallery) {
                try {
                    const galleryData = JSON.parse(req.body.gallery);
                    existingGallery = galleryData.existing || [];
                } catch(e) {
                    console.error('Error parsing gallery data:', e);
                }
            }
            
            // Об'єднуємо галерею
            const allGallery = [...existingGallery, ...galleryImages];
            
            const newProduct = {
                id: Date.now(),
                name: req.body.name.trim(),
                category: req.body.category,
                price: parseFloat(req.body.price),
                description: req.body.description || '',
                specs: req.body.specs || '',
                variants: variants.length ? variants : ['Стандарт'],
                image: mainImage,
                gallery: allGallery,
                createdAt: new Date().toISOString()
            };
            
            products.push(newProduct);
            await fs.writeFile(PRODUCTS_FILE, JSON.stringify(products, null, 2));
            console.log('Товар додано:', newProduct);
            res.status(201).json(newProduct);
            
        } catch(e) { 
            console.error('Server error:', e); 
            res.status(500).json({ error: 'Помилка сервера: ' + e.message }); 
        }
    });
});

app.put('/api/products/:id', isAdmin, (req, res) => {
    uploadGallery(req, res, async (err) => {
        if (err) {
            console.error('Upload error:', err);
            return res.status(400).json({ error: 'Помилка завантаження файлів' });
        }
        
        try {
            const products = JSON.parse(await fs.readFile(PRODUCTS_FILE, 'utf8'));
            const idx = products.findIndex(p => p.id == req.params.id);
            if (idx === -1) return res.status(404).json({ error: 'Товар не знайдено' });
            
            const variants = JSON.parse(req.body.variants || '[]');
            if (!req.body.name?.trim() || !req.body.category || !req.body.price) {
                return res.status(400).json({ error: 'Заповніть обов\'язкові поля' });
            }
            
            // Обробка головного зображення
            let mainImage = products[idx].image;
            if (req.files && req.files.length > 0) {
                const mainFile = req.files.find(f => f.fieldname === 'image') || req.files[0];
                if (mainImage) { 
                    try { await fs.unlink(path.join(__dirname, mainImage)); } catch(e){} 
                }
                mainImage = `/uploads/${mainFile.filename}`;
            }
            
            // Обробка галереї
            const newGalleryImages = [];
            if (req.files && req.files.length > 0) {
                const galleryFiles = req.files.filter(f => f.fieldname.startsWith('gallery_'));
                galleryFiles.forEach(file => {
                    newGalleryImages.push({
                        id: Date.now() + Math.random(),
                        url: `/uploads/${file.filename}`,
                        isMain: false
                    });
                });
            }
            
            // Парсимо існуючі зображення галереї
            let existingGallery = products[idx].gallery || [];
            if (req.body.gallery) {
                try {
                    const galleryData = JSON.parse(req.body.gallery);
                    existingGallery = galleryData.existing || [];
                } catch(e) {
                    console.error('Error parsing gallery data:', e);
                }
            }
            
            // Об'єднуємо галерею
            const allGallery = [...existingGallery, ...newGalleryImages];
            
            products[idx] = {
                ...products[idx],
                name: req.body.name.trim(),
                category: req.body.category,
                price: parseFloat(req.body.price),
                description: req.body.description || '',
                specs: req.body.specs || '',
                variants: variants.length ? variants : ['Стандарт'],
                image: mainImage,
                gallery: allGallery,
                updatedAt: new Date().toISOString()
            };
            
            await fs.writeFile(PRODUCTS_FILE, JSON.stringify(products, null, 2));
            res.json(products[idx]);
            
        } catch(e) { 
            console.error('Server error:', e);
            res.status(500).json({ error: 'Помилка сервера: ' + e.message }); 
        }
    });
});

app.delete('/api/products/:id', isAdmin, async (req, res) => {
    try {
        const products = JSON.parse(await fs.readFile(PRODUCTS_FILE, 'utf8'));
        const idx = products.findIndex(p => p.id == req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Товар не знайдено' });
        
        const product = products[idx];
        
        // Видаляємо головне зображення
        if (product.image) {
            try { await fs.unlink(path.join(__dirname, product.image)); } catch(e){}
        }
        
        // Видаляємо зображення галереї
        if (product.gallery && product.gallery.length > 0) {
            for (const img of product.gallery) {
                try { await fs.unlink(path.join(__dirname, img.url)); } catch(e){}
            }
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

// ============ Інші маршрути ============
app.get('/api/about', async (req, res) => { 
    try { 
        const t = await fs.readFile(ABOUT_FILE, 'utf8'); 
        res.send(t); 
    } catch(e) { 
        res.send(''); 
    } 
});

app.post('/api/about', isAdmin, async (req, res) => { 
    await fs.writeFile(ABOUT_FILE, req.body.text); 
    res.json({ success: true }); 
});

app.get('/api/contact', async (req, res) => { 
    try { 
        const t = await fs.readFile(CONTACT_FILE, 'utf8'); 
        res.send(t); 
    } catch(e) { 
        res.send(''); 
    } 
});

app.post('/api/contact', isAdmin, async (req, res) => { 
    await fs.writeFile(CONTACT_FILE, req.body.text); 
    res.json({ success: true }); 
});

app.get('/api/social', async (req, res) => {
    try { 
        const s = JSON.parse(await fs.readFile(SOCIAL_FILE, 'utf8')); 
        res.json(s); 
    } catch(e) { 
        res.json([]); 
    }
});

app.post('/api/social', isAdmin, async (req, res) => { 
    await fs.writeFile(SOCIAL_FILE, JSON.stringify(req.body, null, 2)); 
    res.json({ success: true }); 
});

app.get('/api/orders', isAdmin, async (req, res) => { 
    try { 
        const o = JSON.parse(await fs.readFile(ORDERS_FILE, 'utf8')); 
        res.json(o); 
    } catch(e) { 
        res.json([]); 
    } 
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

// Статичні файли
app.use('/admin', express.static('public'));
app.get('/admin', (req, res) => {
    if (!req.session.user?.isAdmin) return res.redirect('/');
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.use(express.static('public'));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n=================================`);
    console.log(`🚀 Сервер запущено: http://localhost:${PORT}`);
    console.log(`📌 Адмін-панель: http://localhost:${PORT}/admin`);
    console.log(`👤 Логін: admin, Пароль: admin`);
    console.log(`🖼️  Підтримка галереї зображень: УВІМКНЕНО`);
    console.log(`=================================\n`);
});
