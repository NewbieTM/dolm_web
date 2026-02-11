const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Настройка Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Загрузить фото в Cloudinary
 * @param {String} filePath - путь к файлу или URL
 * @param {String} folder - папка в Cloudinary
 * @returns {Promise<String>} - URL загруженного фото
 */
async function uploadPhoto(filePath, folder = 'clothing-shop') {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folder,
      resource_type: 'image',
      transformation: [
        { width: 1200, height: 1200, crop: 'limit' }, // Ограничиваем размер
        { quality: 'auto' }, // Автоматическая оптимизация качества
        { fetch_format: 'auto' } // Автоматический формат (WebP для поддерживающих браузеров)
      ]
    });
    
    return result.secure_url;
  } catch (error) {
    console.error('Ошибка загрузки в Cloudinary:', error);
    throw error;
  }
}

/**
 * Загрузить несколько фото
 * @param {Array<String>} filePaths - массив путей к файлам
 * @param {String} folder - папка в Cloudinary
 * @returns {Promise<Array<String>>} - массив URL загруженных фото
 */
async function uploadMultiplePhotos(filePaths, folder = 'clothing-shop') {
  try {
    const uploadPromises = filePaths.map(path => uploadPhoto(path, folder));
    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('Ошибка загрузки нескольких фото:', error);
    throw error;
  }
}

/**
 * Удалить фото из Cloudinary
 * @param {String} photoUrl - URL фото для удаления
 * @returns {Promise<Boolean>} - успешность удаления
 */
async function deletePhoto(photoUrl) {
  try {
    // Извлекаем public_id из URL
    const urlParts = photoUrl.split('/');
    const filename = urlParts[urlParts.length - 1].split('.')[0];
    const folder = urlParts[urlParts.length - 2];
    const publicId = `${folder}/${filename}`;
    
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === 'ok';
  } catch (error) {
    console.error('Ошибка удаления из Cloudinary:', error);
    return false;
  }
}

/**
 * Скачать фото из Telegram и загрузить в Cloudinary
 * @param {Object} bot - экземпляр TelegramBot
 * @param {String} fileId - Telegram file_id
 * @param {String} folder - папка в Cloudinary
 * @returns {Promise<String>} - URL загруженного фото
 */
async function uploadTelegramPhoto(bot, fileId, folder = 'clothing-shop') {
  try {
    // Получаем ссылку на файл от Telegram
    const fileLink = await bot.getFileLink(fileId);
    
    // Загружаем напрямую по URL в Cloudinary
    return await uploadPhoto(fileLink, folder);
  } catch (error) {
    console.error('Ошибка загрузки фото из Telegram:', error);
    throw error;
  }
}

module.exports = {
  uploadPhoto,
  uploadMultiplePhotos,
  deletePhoto,
  uploadTelegramPhoto,
  cloudinary
};
