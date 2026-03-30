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
    secret: 'zahid-dron-secret-black-gray',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// Переконуємося, що папка uploads існує
const uploadDir = path.join(__dirname, 'uploads');
fs.mkdir(uploadDir, { recursive: true }).catch(console.error);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
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

async function initData() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        await fs.mkdir('./uploads', { recursive: true });
        await fs.mkdir('./public', { recursive: true });

        // ... решта ініціалізації (така ж, як у попередньому коді) ...
        // (якщо використовуєте мій попередній код, він має працювати)
        // Але для скорочення тут наведу лише важливе
    } catch (err) { console.error('Помилка ініціалізації:', err); }
}
initData();

function isAdmin(req, res, next) {
    if (req.session.user?.isAdmin) return next();
    res.status(403).json({ error: 'Доступ заборонено' });
}

// --- Маршрути для зображень (з перевіркою) ---

app.get('/api/logo', async (req, res) => {
    try {
        const p = await fs.readFile(LOGO_FILE, 'utf8');
        res.send(p || '');
    } catch(e){ res.send(''); }
});

app.post('/api/logo', isAdmin, upload.single('logo'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Файл не завантажено' });
    const filePath = `/uploads/${req.file.filename}`;
    await fs.writeFile(LOGO_FILE, filePath);
    console.log('Logo saved:', filePath);
    res.json({ path: filePath });
});

app.delete('/api/logo', isAdmin, async (req, res) => {
    await fs.writeFile(LOGO_FILE, '');
    res.json({ success: true });
});

// Аналогічно для /api/banner та /api/brand-logo (вони вже є у попередньому коді)

// ... решта маршрутів (вони вже були)

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n=================================\n🚀 Сервер запущено: http://localhost:${PORT}\n📌 Адмін-панель: http://localhost:${PORT}/admin\n👤 Логін: admin, Пароль: admin\n=================================\n`);
});
