#!/bin/bash

# Скрипт диагностики Telegram Mini App

echo "🔍 Диагностика Telegram Mini App"
echo "=================================="
echo ""

# Проверка Node.js
echo "📦 Проверка Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js установлен: $NODE_VERSION"
else
    echo "❌ Node.js НЕ установлен!"
    echo "   Установите с https://nodejs.org/"
    exit 1
fi
echo ""

# Проверка Backend
echo "🔧 Проверка Backend..."
if [ -d "backend" ]; then
    echo "✅ Папка backend найдена"
    
    # Проверка .env
    if [ -f "backend/.env" ]; then
        echo "✅ Файл backend/.env найден"
        
        # Проверка обязательных переменных
        if grep -q "BOT_TOKEN=" backend/.env; then
            echo "✅ BOT_TOKEN настроен"
        else
            echo "⚠️  BOT_TOKEN не найден в .env!"
        fi
        
        if grep -q "ADMIN_ID=" backend/.env; then
            echo "✅ ADMIN_ID настроен"
        else
            echo "⚠️  ADMIN_ID не найден в .env!"
        fi
        
        if grep -q "CLOUDINARY_" backend/.env; then
            echo "✅ Cloudinary настроен"
        else
            echo "⚠️  Cloudinary не настроен!"
        fi
    else
        echo "❌ Файл backend/.env НЕ НАЙДЕН!"
        echo "   Создайте файл из backend/.env.example"
    fi
    
    # Проверка node_modules
    if [ -d "backend/node_modules" ]; then
        echo "✅ Зависимости backend установлены"
    else
        echo "⚠️  Зависимости backend НЕ установлены!"
        echo "   Запустите: cd backend && npm install"
    fi
else
    echo "❌ Папка backend НЕ НАЙДЕНА!"
fi
echo ""

# Проверка Frontend
echo "🎨 Проверка Frontend..."
if [ -d "frontend" ]; then
    echo "✅ Папка frontend найдена"
    
    # Проверка .env
    if [ -f "frontend/.env" ]; then
        echo "✅ Файл frontend/.env найден"
        
        # Проверка VITE_API_URL
        if grep -q "VITE_API_URL=" frontend/.env; then
            API_URL=$(grep "VITE_API_URL=" frontend/.env | cut -d '=' -f2)
            echo "✅ VITE_API_URL: $API_URL"
        else
            echo "❌ VITE_API_URL НЕ НАСТРОЕН!"
            echo "   Добавьте в frontend/.env:"
            echo "   VITE_API_URL=http://localhost:3000"
        fi
    else
        echo "❌ Файл frontend/.env НЕ НАЙДЕН!"
        echo "   Создайте файл frontend/.env с содержимым:"
        echo "   VITE_API_URL=http://localhost:3000"
    fi
    
    # Проверка node_modules
    if [ -d "frontend/node_modules" ]; then
        echo "✅ Зависимости frontend установлены"
    else
        echo "⚠️  Зависимости frontend НЕ установлены!"
        echo "   Запустите: cd frontend && npm install"
    fi
    
    # Проверка index.html
    if [ -f "frontend/index.html" ]; then
        if grep -q "telegram-web-app.js" frontend/index.html; then
            echo "✅ Telegram SDK подключен в index.html"
        else
            echo "⚠️  Telegram SDK НЕ найден в index.html!"
        fi
    fi
else
    echo "❌ Папка frontend НЕ НАЙДЕНА!"
fi
echo ""

# Рекомендации
echo "📋 Рекомендации:"
echo "=================================="

# Проверяем что нужно исправить
ISSUES=0

if [ ! -f "backend/.env" ]; then
    echo "1. Создайте backend/.env из backend/.env.example"
    ISSUES=$((ISSUES+1))
fi

if [ ! -f "frontend/.env" ]; then
    echo "2. Создайте frontend/.env с VITE_API_URL=http://localhost:3000"
    ISSUES=$((ISSUES+1))
fi

if [ ! -d "backend/node_modules" ]; then
    echo "3. Установите зависимости backend: cd backend && npm install"
    ISSUES=$((ISSUES+1))
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "4. Установите зависимости frontend: cd frontend && npm install"
    ISSUES=$((ISSUES+1))
fi

if [ $ISSUES -eq 0 ]; then
    echo "✅ Все проверки пройдены!"
    echo ""
    echo "🚀 Запуск проекта:"
    echo "   Терминал 1: cd backend && npm start"
    echo "   Терминал 2: cd frontend && npm run dev"
else
    echo ""
    echo "⚠️  Найдено проблем: $ISSUES"
    echo "   Исправьте их и запустите скрипт снова"
fi

echo ""
echo "📖 Полная инструкция: FIX_MINIAPP.md"
