# 🛠️ Документация для разработчиков

## Архитектура

```
┌─────────────────┐
│  Telegram Bot   │  ← Пользователь
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   Mini App      │  ← React Frontend (Vercel)
│   (Frontend)    │
└────────┬────────┘
         │ HTTP/REST
         ↓
┌─────────────────┐
│   API Server    │  ← Express Backend (Render)
│   (Backend)     │
└────────┬────────┘
         │
    ┌────┴────┬──────────┐
    ↓         ↓          ↓
┌───────┐ ┌──────┐ ┌──────────┐
│ JSON  │ │ Bot  │ │Cloudinary│
│ Files │ │ API  │ │  (Фото)  │
└───────┘ └──────┘ └──────────┘
```

---

## Backend

### Структура файлов

```
backend/
├── server.js         # Express API сервер
├── bot.js           # Telegram бот (polling)
├── database.js      # Работа с JSON файлами
├── cloudinary.js    # Загрузка фото
├── .env             # Конфигурация
├── package.json
└── data/
    ├── products.json   # Товары
    ├── users.json      # Пользователи  
    └── stats.json      # Статистика
```

### API Endpoints

#### Products
```
GET  /api/products              # Список товаров + фильтры
GET  /api/products/:id          # Один товар
POST /api/products/:id/view     # Просмотр товара
```

#### Categories
```
GET  /api/categories            # Список категорий
```

#### Users
```
GET  /api/users/:userId         # Данные пользователя
POST /api/users/:userId         # Создать/обновить
```

#### Favorites
```
GET    /api/users/:userId/favorites            # Список избранного
POST   /api/users/:userId/favorites/:productId # Добавить
DELETE /api/users/:userId/favorites/:productId # Удалить
```

#### History
```
GET  /api/users/:userId/history            # История просмотров
POST /api/users/:userId/history/:productId # Добавить в историю
```

#### Stats & Config
```
GET /api/stats     # Статистика (админ)
GET /api/config    # Конфигурация
```

### Модели данных

#### Product
```typescript
{
  id: string,
  name: string,
  price: number,
  description: string,
  category: string,
  photos: string[],
  views: number,
  createdAt: string,
  updatedAt?: string
}
```

#### User
```typescript
{
  id: string,
  username?: string,
  firstName?: string,
  lastName?: string,
  favorites: string[],      // Product IDs
  viewHistory: string[],    // Product IDs
  createdAt: string,
  lastActive: string
}
```

#### Stats
```typescript
{
  totalViews: number,
  totalUsers: number,
  popularProducts: { [productId: string]: number },
  dailyStats: {
    [date: string]: {
      views: number,
      users: string[]
    }
  }
}
```

---

## Frontend

### Структура файлов

```
frontend/
├── src/
│   ├── App.jsx              # Главный компонент + роутинг
│   ├── main.jsx            # Точка входа
│   ├── index.css           # Глобальные стили
│   ├── components/
│   │   ├── ProductCard.jsx      # Карточка товара
│   │   ├── CategoryFilter.jsx   # Фильтр категорий
│   │   ├── SearchBar.jsx        # Поиск
│   │   └── BottomNav.jsx        # Нижнее меню
│   ├── pages/
│   │   ├── Catalog.jsx     # Каталог товаров
│   │   ├── Product.jsx     # Страница товара
│   │   ├── Favorites.jsx   # Избранное
│   │   └── History.jsx     # История
│   └── utils/
│       ├── api.js          # HTTP клиент
│       └── telegram.js     # Telegram WebApp SDK
├── index.html
├── package.json
├── vite.config.js
└── tailwind.config.js
```

### Роутинг

```javascript
/ → Catalog           # Главная страница с каталогом
/product/:id → Product  # Детальная страница товара
/favorites → Favorites  # Избранное
/history → History      # История просмотров
```

### Состояние приложения

Приложение использует React hooks для управления состоянием:
- `useState` - локальное состояние компонентов
- `useEffect` - побочные эффекты и загрузка данных
- `useNavigate` - навигация
- Нет глобального стейт менеджера (Redux/MobX)

### Telegram WebApp SDK

Основные функции из `utils/telegram.js`:

```javascript
initTelegramApp()           // Инициализация
getUserId()                 // ID пользователя
getUserData()               // Данные пользователя
vibrate(style)              // Вибрация
showBackButton(callback)    // Показать кнопку назад
hideBackButton()            // Скрыть кнопку назад
openTelegramLink(url)       // Открыть Telegram ссылку
```

---

## Telegram Bot

### Команды

**Публичные:**
- `/start` - Приветствие

**Админ:**
- `/admin` - Главное меню админа
- `/add_product` - Добавить товар
- `/list_products` - Список товаров
- `/delete_product [ID]` - Удалить товар
- `/stats` - Статистика
- `/categories` - Категории

### Workflow добавления товара

```
1. /add_product
2. Ввод названия
3. Ввод цены
4. Ввод описания
5. Выбор категории (inline кнопки)
6. Отправка фото (можно несколько)
7. /done
```

Данные хранятся в `tempProductData[chatId]` до завершения.

---

## База данных (JSON)

### Выбор между JSON и MongoDB

**JSON (текущий):**
✅ Простота
✅ Нет зависимостей
✅ Бесплатно
❌ Не масштабируется
❌ Нет транзакций

**MongoDB (будущее):**
✅ Масштабируемость
✅ Транзакции
✅ Индексы
✅ Агрегации
❌ Сложнее настройка
❌ Платно (или Atlas Free)

### Миграция на MongoDB

Для миграции на MongoDB:

1. Установите `mongodb` пакет:
```bash
npm install mongodb
```

2. Создайте `backend/mongodb.js`:
```javascript
const { MongoClient } = require('mongodb');
const client = new MongoClient(process.env.MONGODB_URI);

// Реализуйте те же функции что в database.js
```

3. Обновите `server.js`:
```javascript
const db = require('./mongodb'); // вместо database
```

---

## Стили и Темизация

### Tailwind CSS

**Кастомные цвета:**
```javascript
// tailwind.config.js
colors: {
  'dark-bg': '#0F0F0F',      // Фон
  'dark-card': '#1A1A1A',    // Карточки
  'dark-hover': '#252525',   // Hover
  'accent': '#6366F1',        // Акцент
}
```

**Изменить тему:**
1. Измените `tailwind.config.js`
2. Пересоберите: `npm run build`

### CSS классы

```css
.fade-in         # Анимация появления
.glass-effect    # Стеклянный эффект
.text-gradient   # Градиентный текст
.skeleton        # Скелетон загрузки
```

---

## Оптимизация

### Backend

**1. Кэширование:**
```javascript
// Пример с node-cache
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 600 }); // 10 мин

app.get('/api/products', async (req, res) => {
  const cached = cache.get('products');
  if (cached) return res.json(cached);
  
  const products = await db.getAllProducts();
  cache.set('products', products);
  res.json(products);
});
```

**2. Сжатие:**
```javascript
const compression = require('compression');
app.use(compression());
```

**3. Rate limiting:**
```javascript
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);
```

### Frontend

**1. Lazy loading изображений:**
```jsx
<img loading="lazy" src={...} />
```

**2. Code splitting:**
```javascript
const Product = lazy(() => import('./pages/Product'));
```

**3. Мемоизация:**
```javascript
const MemoizedCard = React.memo(ProductCard);
```

---

## Тестирование

### Backend (Jest)

```bash
npm install --save-dev jest supertest
```

```javascript
// __tests__/api.test.js
const request = require('supertest');
const app = require('../server');

describe('GET /api/products', () => {
  it('should return products', async () => {
    const res = await request(app).get('/api/products');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
```

### Frontend (Vitest)

```bash
npm install --save-dev vitest @testing-library/react
```

```javascript
// src/__tests__/ProductCard.test.jsx
import { render } from '@testing-library/react';
import ProductCard from '../components/ProductCard';

test('renders product name', () => {
  const product = { name: 'Test', price: 100 };
  const { getByText } = render(<ProductCard product={product} />);
  expect(getByText('Test')).toBeInTheDocument();
});
```

---

## Безопасность

### Общие рекомендации

1. **Переменные окружения:**
   - Никогда не коммитьте `.env`
   - Используйте `.env.example` для шаблонов

2. **Валидация:**
```javascript
// Валидация цены
if (isNaN(price) || price <= 0) {
  return res.status(400).json({ error: 'Invalid price' });
}
```

3. **Санитизация:**
```javascript
const sanitize = (str) => str.trim().slice(0, 500);
```

4. **CORS:**
```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
```

5. **HTTPS:**
   - Render автоматически
   - Vercel автоматически

---

## Мониторинг и Логирование

### Winston (логирование)

```bash
npm install winston
```

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

logger.info('Server started');
logger.error('Error occurred', { error });
```

### Sentry (мониторинг ошибок)

```bash
npm install @sentry/node
```

```javascript
const Sentry = require('@sentry/node');

Sentry.init({ dsn: process.env.SENTRY_DSN });

app.use(Sentry.Handlers.errorHandler());
```

---

## FAQ для разработчиков

### Как добавить новый endpoint?

```javascript
// backend/server.js
app.get('/api/custom', async (req, res) => {
  try {
    // Ваша логика
    res.json({ success: true, data: ... });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

### Как добавить новую страницу?

```javascript
// 1. Создайте компонент
// frontend/src/pages/NewPage.jsx
export default function NewPage() {
  return <div>New Page</div>;
}

// 2. Добавьте роут
// frontend/src/App.jsx
<Route path="/new" element={<NewPage />} />
```

### Как изменить дизайн карточки?

Откройте `frontend/src/components/ProductCard.jsx` и измените JSX/CSS.

### Как добавить поле в Product?

1. Обновите модель в `backend/database.js`
2. Обновите форму в `backend/bot.js`
3. Отобразите в `frontend/src/pages/Product.jsx`

---

## Полезные ссылки

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Telegram WebApp](https://core.telegram.org/bots/webapps)
- [Express.js](https://expressjs.com/)
- [React](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Vite](https://vitejs.dev/)
- [Cloudinary](https://cloudinary.com/documentation)

---

**Happy coding! 🚀**
