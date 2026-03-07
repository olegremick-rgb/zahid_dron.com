// server.js - повна версія з усіма функціями
const express = require('express');
const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

// Налаштування
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

app.use(session({
    secret: 'zahid-dron-secret-key-2024-change-this-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 24 * 60 * 60 * 1000, // 24 години
        httpOnly: true,
        secure: false // встановіть true якщо використовуєте HTTPS
    }
}));

// Налаштування завантаження файлів
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './uploads/');
    },
    filename: (req, file, cb) => {
        // Створюємо унікальне ім'я файлу
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});

// Фільтр для перевірки типу файлів
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Дозволені тільки зображення (jpg, jpeg, png, gif, webp, svg)'));
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // ліміт 10MB
});

// Файли даних
const DATA_DIR = './data';
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const CATEGORIES_FILE = path.join(DATA_DIR, 'categories.json');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const ABOUT_FILE = path.join(DATA_DIR, 'about.txt');
const CONTACT_FILE = path.join(DATA_DIR, 'contact.txt');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const SOCIAL_FILE = path.join(DATA_DIR, 'social.json');
const LOGO_FILE = path.join(DATA_DIR, 'logo.txt');

// Ініціалізація даних
async function initData() {
    try {
        // Створюємо директорії якщо їх немає
        await fs.mkdir(DATA_DIR, { recursive: true });
        await fs.mkdir('./uploads', { recursive: true });
        await fs.mkdir('./public', { recursive: true });

        // Користувачі
        try {
            await fs.access(USERS_FILE);
        } catch {
            await fs.writeFile(USERS_FILE, JSON.stringify([
                { username: 'admin', password: 'admin', isAdmin: true }
            ], null, 2));
            console.log('✅ Створено файл користувачів');
        }

        // Категорії
        try {
            await fs.access(CATEGORIES_FILE);
        } catch {
            await fs.writeFile(CATEGORIES_FILE, JSON.stringify(['Дрони', 'Реб'], null, 2));
            console.log('✅ Створено файл категорій');
        }

        // Товари
        try {
            await fs.access(PRODUCTS_FILE);
        } catch {
            await fs.writeFile(PRODUCTS_FILE, JSON.stringify([
                {
                    id: 1,
                    name: 'Квадрокоптер DJI Mavic 3',
                    category: 'Дрони',
                    price: 85000,
                    description: 'Професійний дрон з камерою Hasselblad, потрійна камера, 46 хвилин польоту',
                    variants: ['Standard', 'Pro', 'Cine'],
                    image: null,
                    createdAt: new Date().toISOString()
                },
                {
                    id: 2,
                    name: 'Карбонові реб 3K',
                    category: 'Реб',
                    price: 1200,
                    description: 'Високоякісні карбонові ребра для FPV дронів, легкі та міцні',
                    variants: ['200mm', '250mm', '300mm', '350mm'],
                    image: null,
                    createdAt: new Date().toISOString()
                },
                {
                    id: 3,
                    name: 'FPV Drone iFlight Titan',
                    category: 'Дрони',
                    price: 32000,
                    description: 'Готовий до польотів FPV дрон, 6S, з камерою GoPro mount',
                    variants: ['5"', '6"', '7"'],
                    image: null,
                    createdAt: new Date().toISOString()
                }
            ], null, 2));
            console.log('✅ Створено файл товарів');
        }

        // Про нас
        try {
            await fs.access(ABOUT_FILE);
        } catch {
            await fs.writeFile(ABOUT_FILE, 'Ми — команда професіоналів, яка займається продажем дронів та реб. Пропонуємо тільки якісну техніку та комплектуючі. Доставка по всій Україні. Працюємо з 2020 року, маємо власний сервісний центр.');
            console.log('✅ Створено файл "Про нас"');
        }

        // Контакти
        try {
            await fs.access(CONTACT_FILE);
        } catch {
            await fs.writeFile(CONTACT_FILE, 'Телефон: +380 99 123 45 67\nEmail: info@zahidron.ua\nГрафік: Пн-Пт 10:00-19:00, Сб 11:00-16:00\nАдреса: м. Львів, вул. Прикладна 1');
            console.log('✅ Створено файл контактів');
        }

        // Замовлення
        try {
            await fs.access(ORDERS_FILE);
        } catch {
            await fs.writeFile(ORDERS_FILE, JSON.stringify([], null, 2));
            console.log('✅ Створено файл замовлень');
        }

        // Соціальні мережі
        try {
            await fs.access(SOCIAL_FILE);
        } catch {
            await fs.writeFile(SOCIAL_FILE, JSON.stringify([
                { 
                    platform: 'telegram', 
                    url: 'https://t.me/zahid_dron', 
                    icon: 'fa-brands fa-telegram', 
                    name: 'Telegram',
                    active: true 
                },
                { 
                    platform: 'instagram', 
                    url: 'https://instagram.com/zahid_dron', 
                    icon: 'fa-brands fa-instagram', 
                    name: 'Instagram',
                    active: true 
                },
                { 
                    platform: 'facebook', 
                    url: 'https://facebook.com/zahid.dron', 
                    icon: 'fa-brands fa-facebook', 
                    name: 'Facebook',
                    active: true 
                },
                { 
                    platform: 'viber', 
                    url: 'viber://chat?number=380991234567', 
                    icon: 'fa-brands fa-viber', 
                    name: 'Viber',
                    active: true 
                },
                { 
                    platform: 'whatsapp', 
                    url: 'https://wa.me/380991234567', 
                    icon: 'fa-brands fa-whatsapp', 
                    name: 'WhatsApp',
                    active: true 
                }
            ], null, 2));
            console.log('✅ Створено файл соціальних мереж');
        }

        // Логотип
        try {
            await fs.access(LOGO_FILE);
        } catch {
            await fs.writeFile(LOGO_FILE, '');
            console.log('✅ Створено файл логотипу');
        }

        console.log('✅ Всі дані успішно ініціалізовано');
    } catch (error) {
        console.error('❌ Помилка ініціалізації даних:', error);
    }
}

// Запускаємо ініціалізацію
initData();

// ============ API Routes ============

// Перевірка авторизації
app.get('/api/user', (req, res) => {
    if (req.session.user) {
        res.json(req.session.user);
    } else {
        res.status(401).json({ error: 'Не авторизований' });
    }
});

// Логін
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const users = JSON.parse(await fs.readFile(USERS_FILE, 'utf8'));
        const user = users.find(u => u.username === username && u.password === password);
        
        if (user) {
            req.session.user = { username: user.username, isAdmin: user.isAdmin };
            res.json({ username: user.username, isAdmin: user.isAdmin });
        } else {
            res.status(401).json({ error: 'Невірний логін або пароль' });
        }
    } catch (error) {
        console.error('Помилка логіну:', error);
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

// Логаут
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Реєстрація
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
    } catch (error) {
        console.error('Помилка реєстрації:', error);
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

// ============ Зміна пароля адміна ============

app.post('/api/admin/change-password', async (req, res) => {
    if (!req.session.user?.isAdmin) {
        return res.status(403).json({ error: 'Доступ заборонено' });
    }
    
    try {
        const { currentPassword, newUsername, newPassword } = req.body;
        const users = JSON.parse(await fs.readFile(USERS_FILE, 'utf8'));
        
        // Знаходимо адміна
        const adminIndex = users.findIndex(u => u.username === req.session.user.username);
        
        if (adminIndex === -1) {
            return res.status(404).json({ error: 'Користувача не знайдено' });
        }
        
        // Перевіряємо поточний пароль
        if (users[adminIndex].password !== currentPassword) {
            return res.status(401).json({ error: 'Невірний поточний пароль' });
        }
        
        // Оновлюємо логін якщо вказано
        if (newUsername && newUsername.trim() !== '') {
            // Перевіряємо чи новий логін не зайнятий
            if (users.some(u => u.username === newUsername && u.username !== req.session.user.username)) {
                return res.status(400).json({ error: 'Цей логін вже використовується' });
            }
            users[adminIndex].username = newUsername;
        }
        
        // Оновлюємо пароль якщо вказано
        if (newPassword && newPassword.trim() !== '') {
            if (newPassword.length < 6) {
                return res.status(400).json({ error: 'Пароль повинен містити щонайменше 6 символів' });
            }
            users[adminIndex].password = newPassword;
        }
        
        // Зберігаємо зміни
        await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
        
        // Видаляємо сесію щоб користувач перелогінився
        req.session.destroy();
        
        res.json({ success: true, message: 'Дані оновлено. Будь ласка, увійдіть заново.' });
    } catch (error) {
        console.error('Помилка зміни пароля:', error);
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

// ============ Логотип ============

// Отримати логотип
app.get('/api/logo', async (req, res) => {
    try {
        const logoPath = await fs.readFile(LOGO_FILE, 'utf8');
        res.send(logoPath || '');
    } catch (error) {
        console.error('Помилка отримання логотипу:', error);
        res.status(500).send('');
    }
});

// Завантажити логотип
app.post('/api/logo', upload.single('logo'), async (req, res) => {
    if (!req.session.user?.isAdmin) {
        return res.status(403).json({ error: 'Доступ заборонено' });
    }
    
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Файл не завантажено' });
        }
        
        const logoPath = `/uploads/${req.file.filename}`;
        await fs.writeFile(LOGO_FILE, logoPath);
        res.json({ path: logoPath });
    } catch (error) {
        console.error('Помилка завантаження логотипу:', error);
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

// Видалити логотип
app.delete('/api/logo', async (req, res) => {
    if (!req.session.user?.isAdmin) {
        return res.status(403).json({ error: 'Доступ заборонено' });
    }
    
    try {
        await fs.writeFile(LOGO_FILE, '');
        res.json({ success: true });
    } catch (error) {
        console.error('Помилка видалення логотипу:', error);
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

// ============ Категорії ============

// Отримати всі категорії
app.get('/api/categories', async (req, res) => {
    try {
        const categories = JSON.parse(await fs.readFile(CATEGORIES_FILE, 'utf8'));
        res.json(categories);
    } catch (error) {
        console.error('Помилка отримання категорій:', error);
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

// Додати категорію
app.post('/api/categories', async (req, res) => {
    if (!req.session.user?.isAdmin) {
        return res.status(403).json({ error: 'Доступ заборонено' });
    }
    
    try {
        const { category } = req.body;
        
        if (!category || category.trim() === '') {
            return res.status(400).json({ error: 'Назва категорії обов\'язкова' });
        }
        
        const categories = JSON.parse(await fs.readFile(CATEGORIES_FILE, 'utf8'));
        
        if (!categories.includes(category)) {
            categories.push(category);
            await fs.writeFile(CATEGORIES_FILE, JSON.stringify(categories, null, 2));
            res.json({ success: true });
        } else {
            res.status(400).json({ error: 'Категорія вже існує' });
        }
    } catch (error) {
        console.error('Помилка додавання категорії:', error);
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

// Видалити категорію
app.delete('/api/categories/:category', async (req, res) => {
    if (!req.session.user?.isAdmin) {
        return res.status(403).json({ error: 'Доступ заборонено' });
    }
    
    try {
        const categoryToDelete = decodeURIComponent(req.params.category);
        const categories = JSON.parse(await fs.readFile(CATEGORIES_FILE, 'utf8'));
        const products = JSON.parse(await fs.readFile(PRODUCTS_FILE, 'utf8'));
        
        // Перевіряємо чи є товари в цій категорії
        if (products.some(p => p.category === categoryToDelete)) {
            return res.status(400).json({ error: 'Неможливо видалити категорію з товарами' });
        }
        
        const index = categories.indexOf(categoryToDelete);
        if (index > -1) {
            categories.splice(index, 1);
            await fs.writeFile(CATEGORIES_FILE, JSON.stringify(categories, null, 2));
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Категорію не знайдено' });
        }
    } catch (error) {
        console.error('Помилка видалення категорії:', error);
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

// ============ Товари ============

// Отримати всі товари
app.get('/api/products', async (req, res) => {
    try {
        const products = JSON.parse(await fs.readFile(PRODUCTS_FILE, 'utf8'));
        res.json(products);
    } catch (error) {
        console.error('Помилка отримання товарів:', error);
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

// Додати товар
app.post('/api/products', upload.single('image'), async (req, res) => {
    if (!req.session.user?.isAdmin) {
        return res.status(403).json({ error: 'Доступ заборонено' });
    }
    
    try {
        const products = JSON.parse(await fs.readFile(PRODUCTS_FILE, 'utf8'));
        const variants = JSON.parse(req.body.variants || '[]');
        
        // Валідація
        if (!req.body.name || req.body.name.trim() === '') {
            return res.status(400).json({ error: 'Назва товару обов\'язкова' });
        }
        
        if (!req.body.category) {
            return res.status(400).json({ error: 'Категорія обов\'язкова' });
        }
        
        if (!req.body.price || isNaN(req.body.price) || req.body.price <= 0) {
            return res.status(400).json({ error: 'Коректна ціна обов\'язкова' });
        }
        
        const newProduct = {
            id: Date.now(),
            name: req.body.name.trim(),
            category: req.body.category,
            price: parseFloat(req.body.price),
            description: req.body.description || '',
            variants: variants.length ? variants : ['Стандарт'],
            image: req.file ? `/uploads/${req.file.filename}` : null,
            createdAt: new Date().toISOString()
        };
        
        products.push(newProduct);
        await fs.writeFile(PRODUCTS_FILE, JSON.stringify(products, null, 2));
        res.status(201).json(newProduct);
    } catch (error) {
        console.error('Помилка додавання товару:', error);
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

// Видалити товар
app.delete('/api/products/:id', async (req, res) => {
    if (!req.session.user?.isAdmin) {
        return res.status(403).json({ error: 'Доступ заборонено' });
    }
    
    try {
        const products = JSON.parse(await fs.readFile(PRODUCTS_FILE, 'utf8'));
        const product = products.find(p => p.id == req.params.id);
        
        if (!product) {
            return res.status(404).json({ error: 'Товар не знайдено' });
        }
        
        // Видаляємо зображення якщо воно є
        if (product.image) {
            const imagePath = path.join(__dirname, product.image);
            try {
                await fs.unlink(imagePath);
            } catch (e) {
                console.log('Не вдалося видалити зображення:', e);
            }
        }
        
        const filtered = products.filter(p => p.id != req.params.id);
        await fs.writeFile(PRODUCTS_FILE, JSON.stringify(filtered, null, 2));
        res.json({ success: true });
    } catch (error) {
        console.error('Помилка видалення товару:', error);
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

// Видалити варіант товару
app.delete('/api/products/:id/variant/:index', async (req, res) => {
    if (!req.session.user?.isAdmin) {
        return res.status(403).json({ error: 'Доступ заборонено' });
    }
    
    try {
        const products = JSON.parse(await fs.readFile(PRODUCTS_FILE, 'utf8'));
        const product = products.find(p => p.id == req.params.id);
        
        if (product) {
            const index = parseInt(req.params.index);
            if (index >= 0 && index < product.variants.length) {
                product.variants.splice(index, 1);
                await fs.writeFile(PRODUCTS_FILE, JSON.stringify(products, null, 2));
                res.json({ success: true });
            } else {
                res.status(404).json({ error: 'Варіант не знайдено' });
            }
        } else {
            res.status(404).json({ error: 'Товар не знайдено' });
        }
    } catch (error) {
        console.error('Помилка видалення варіанту:', error);
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

// ============ Про нас ============

app.get('/api/about', async (req, res) => {
    try {
        const text = await fs.readFile(ABOUT_FILE, 'utf8');
        res.send(text);
    } catch (error) {
        console.error('Помилка отримання "Про нас":', error);
        res.status(500).send('Помилка завантаження');
    }
});

app.post('/api/about', async (req, res) => {
    if (!req.session.user?.isAdmin) {
        return res.status(403).json({ error: 'Доступ заборонено' });
    }
    
    try {
        await fs.writeFile(ABOUT_FILE, req.body.text);
        res.json({ success: true });
    } catch (error) {
        console.error('Помилка збереження "Про нас":', error);
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

// ============ Контакти ============

app.get('/api/contact', async (req, res) => {
    try {
        const text = await fs.readFile(CONTACT_FILE, 'utf8');
        res.send(text);
    } catch (error) {
        console.error('Помилка отримання контактів:', error);
        res.status(500).send('Помилка завантаження');
    }
});

app.post('/api/contact', async (req, res) => {
    if (!req.session.user?.isAdmin) {
        return res.status(403).json({ error: 'Доступ заборонено' });
    }
    
    try {
        await fs.writeFile(CONTACT_FILE, req.body.text);
        res.json({ success: true });
    } catch (error) {
        console.error('Помилка збереження контактів:', error);
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

// ============ Соціальні мережі ============

// Отримати всі соціальні мережі
app.get('/api/social', async (req, res) => {
    try {
        const social = JSON.parse(await fs.readFile(SOCIAL_FILE, 'utf8'));
        // Для публічного перегляду повертаємо тільки активні
        if (!req.session.user?.isAdmin) {
            res.json(social.filter(s => s.active));
        } else {
            res.json(social);
        }
    } catch (error) {
        console.error('Помилка отримання соцмереж:', error);
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

// Оновити всі соціальні мережі
app.post('/api/social', async (req, res) => {
    if (!req.session.user?.isAdmin) {
        return res.status(403).json({ error: 'Доступ заборонено' });
    }
    
    try {
        await fs.writeFile(SOCIAL_FILE, JSON.stringify(req.body, null, 2));
        res.json({ success: true });
    } catch (error) {
        console.error('Помилка оновлення соцмереж:', error);
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

// ============ Замовлення ============

// Отримати всі замовлення (тільки для адміна)
app.get('/api/orders', async (req, res) => {
    if (!req.session.user?.isAdmin) {
        return res.status(403).json({ error: 'Доступ заборонено' });
    }
    
    try {
        const orders = JSON.parse(await fs.readFile(ORDERS_FILE, 'utf8'));
        res.json(orders);
    } catch (error) {
        console.error('Помилка отримання замовлень:', error);
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

// Створити замовлення
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
    } catch (error) {
        console.error('Помилка створення замовлення:', error);
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

// ============ Статистика ============

app.get('/api/stats', async (req, res) => {
    if (!req.session.user?.isAdmin) {
        return res.status(403).json({ error: 'Доступ заборонено' });
    }
    
    try {
        const products = JSON.parse(await fs.readFile(PRODUCTS_FILE, 'utf8'));
        const categories = JSON.parse(await fs.readFile(CATEGORIES_FILE, 'utf8'));
        const orders = JSON.parse(await fs.readFile(ORDERS_FILE, 'utf8'));
        
        // Обраховуємо загальну суму замовлень
        const totalOrdersSum = orders.reduce((sum, order) => {
            const product = products.find(p => p.id == order.productId);
            return sum + (product?.price || 0);
        }, 0);
        
        // Обраховуємо загальну кількість варіантів
        const variantsCount = products.reduce((acc, p) => acc + p.variants.length, 0);
        
        res.json({
            productsCount: products.length,
            categoriesCount: categories.length,
            ordersCount: orders.length,
            totalOrdersSum,
            variantsCount
        });
    } catch (error) {
        console.error('Помилка отримання статистики:', error);
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

// ============ Сторінки ============

// Віддаємо HTML файли
app.get('/admin', (req, res) => {
    if (!req.session.user?.isAdmin) {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Обробка помилок
app.use((err, req, res, next) => {
    console.error('❌ Помилка:', err.stack);
    res.status(500).json({ error: err.message || 'Щось пішло не так' });
});

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
    console.log('\n=================================');
    console.log('🚀 Сервер запущено!');
    console.log(`📌 Основна сторінка: http://localhost:${PORT}`);
    console.log(`📌 Адмін-панель: http://localhost:${PORT}/admin`);
    console.log('=================================');
    console.log('👤 Логін: admin');
    console.log('🔑 Пароль: admin');
    console.log('=================================\n');
});
