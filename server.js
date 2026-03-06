// server.js (оновлений)
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
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// Налаштування завантаження файлів
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// Файли даних
const DATA_DIR = './data';
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const CATEGORIES_FILE = path.join(DATA_DIR, 'categories.json');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const ABOUT_FILE = path.join(DATA_DIR, 'about.txt');
const CONTACT_FILE = path.join(DATA_DIR, 'contact.txt');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');

// Ініціалізація даних
async function initData() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        await fs.mkdir('./uploads', { recursive: true });

        // Користувачі
        try {
            await fs.access(USERS_FILE);
        } catch {
            await fs.writeFile(USERS_FILE, JSON.stringify([
                { username: 'admin', password: 'admin', isAdmin: true }
            ]));
        }

        // Категорії
        try {
            await fs.access(CATEGORIES_FILE);
        } catch {
            await fs.writeFile(CATEGORIES_FILE, JSON.stringify(['Дрони', 'Реб']));
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
                    description: 'Професійний дрон з камерою Hasselblad',
                    variants: ['Standard', 'Pro', 'Cine'],
                    image: null
                },
                {
                    id: 2,
                    name: 'Карбонові реб 3K',
                    category: 'Реб',
                    price: 1200,
                    description: 'Високоякісні карбонові ребра для FPV дронів',
                    variants: ['200mm', '250mm', '300mm'],
                    image: null
                }
            ]));
        }

        // Про нас
        try {
            await fs.access(ABOUT_FILE);
        } catch {
            await fs.writeFile(ABOUT_FILE, 'Ми — команда професіоналів, яка займається продажем дронів та реб. Пропонуємо тільки якісну техніку та комплектуючі. Доставка по всій Україні.');
        }

        // Контакти
        try {
            await fs.access(CONTACT_FILE);
        } catch {
            await fs.writeFile(CONTACT_FILE, 'Телефон: +380 99 123 45 67\nEmail: info@zahidron.ua\nГрафік: Пн-Пт 10:00-19:00');
        }

        // Замовлення
        try {
            await fs.access(ORDERS_FILE);
        } catch {
            await fs.writeFile(ORDERS_FILE, '[]');
        }
    } catch (error) {
        console.error('Помилка ініціалізації даних:', error);
    }
}

initData();

// API Routes
app.get('/api/user', (req, res) => {
    if (req.session.user) {
        res.json(req.session.user);
    } else {
        res.status(401).send();
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const users = JSON.parse(await fs.readFile(USERS_FILE));
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        req.session.user = { username: user.username, isAdmin: user.isAdmin };
        res.json({ username: user.username, isAdmin: user.isAdmin });
    } else {
        res.status(401).send();
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.send();
});

app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    const users = JSON.parse(await fs.readFile(USERS_FILE));
    
    if (users.find(u => u.username === username)) {
        res.status(400).send();
    } else {
        users.push({ username, password, isAdmin: false });
        await fs.writeFile(USERS_FILE, JSON.stringify(users));
        res.status(201).send();
    }
});

app.get('/api/categories', async (req, res) => {
    const categories = JSON.parse(await fs.readFile(CATEGORIES_FILE));
    res.json(categories);
});

app.post('/api/categories', async (req, res) => {
    if (!req.session.user?.isAdmin) return res.status(403).send();
    
    const { category } = req.body;
    const categories = JSON.parse(await fs.readFile(CATEGORIES_FILE));
    
    if (!categories.includes(category)) {
        categories.push(category);
        await fs.writeFile(CATEGORIES_FILE, JSON.stringify(categories));
    }
    res.status(201).send();
});

app.delete('/api/categories/:category', async (req, res) => {
    if (!req.session.user?.isAdmin) return res.status(403).send();
    
    const categoryToDelete = decodeURIComponent(req.params.category);
    const categories = JSON.parse(await fs.readFile(CATEGORIES_FILE));
    const products = JSON.parse(await fs.readFile(PRODUCTS_FILE));
    
    // Перевіряємо чи є товари в цій категорії
    if (products.some(p => p.category === categoryToDelete)) {
        return res.status(400).send('Category has products');
    }
    
    const index = categories.indexOf(categoryToDelete);
    if (index > -1) {
        categories.splice(index, 1);
        await fs.writeFile(CATEGORIES_FILE, JSON.stringify(categories));
    }
    res.send();
});

app.get('/api/products', async (req, res) => {
    const products = JSON.parse(await fs.readFile(PRODUCTS_FILE));
    res.json(products);
});

app.post('/api/products', upload.single('image'), async (req, res) => {
    if (!req.session.user?.isAdmin) return res.status(403).send();
    
    const products = JSON.parse(await fs.readFile(PRODUCTS_FILE));
    const variants = JSON.parse(req.body.variants || '[]');
    
    const newProduct = {
        id: Date.now(),
        name: req.body.name,
        category: req.body.category,
        price: parseFloat(req.body.price),
        description: req.body.description,
        variants,
        image: req.file ? `/uploads/${req.file.filename}` : null
    };
    
    products.push(newProduct);
    await fs.writeFile(PRODUCTS_FILE, JSON.stringify(products, null, 2));
    res.status(201).json(newProduct);
});

app.delete('/api/products/:id', async (req, res) => {
    if (!req.session.user?.isAdmin) return res.status(403).send();
    
    const products = JSON.parse(await fs.readFile(PRODUCTS_FILE));
    const filtered = products.filter(p => p.id != req.params.id);
    await fs.writeFile(PRODUCTS_FILE, JSON.stringify(filtered, null, 2));
    res.send();
});

app.delete('/api/products/:id/variant/:index', async (req, res) => {
    if (!req.session.user?.isAdmin) return res.status(403).send();
    
    const products = JSON.parse(await fs.readFile(PRODUCTS_FILE));
    const product = products.find(p => p.id == req.params.id);
    
    if (product) {
        const index = parseInt(req.params.index);
        if (index >= 0 && index < product.variants.length) {
            product.variants.splice(index, 1);
            await fs.writeFile(PRODUCTS_FILE, JSON.stringify(products, null, 2));
        }
    }
    res.send();
});

app.get('/api/about', async (req, res) => {
    const text = await fs.readFile(ABOUT_FILE, 'utf8');
    res.send(text);
});

app.post('/api/about', async (req, res) => {
    if (!req.session.user?.isAdmin) return res.status(403).send();
    
    await fs.writeFile(ABOUT_FILE, req.body.text);
    res.send();
});

app.get('/api/contact', async (req, res) => {
    const text = await fs.readFile(CONTACT_FILE, 'utf8');
    res.send(text);
});

app.post('/api/contact', async (req, res) => {
    if (!req.session.user?.isAdmin) return res.status(403).send();
    
    await fs.writeFile(CONTACT_FILE, req.body.text);
    res.send();
});

app.get('/api/orders', async (req, res) => {
    if (!req.session.user?.isAdmin) return res.status(403).send();
    
    const orders = JSON.parse(await fs.readFile(ORDERS_FILE));
    res.json(orders);
});

app.post('/api/orders', async (req, res) => {
    const orders = JSON.parse(await fs.readFile(ORDERS_FILE));
    orders.push({
        id: Date.now(),
        ...req.body,
        date: new Date().toISOString()
    });
    await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2));
    res.status(201).send();
});

// Віддаємо HTML
app.get('/admin', (req, res) => {
    if (!req.session.user?.isAdmin) {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Сервер запущено на http://localhost:${PORT}`);
});