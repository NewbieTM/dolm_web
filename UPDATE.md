# из корня репо
cd backend
npm install        # один раз
npm start          # поднимает API на http://localhost:3000

# во втором терминале
cd d:\!PROJS\DOLM_TG_MAGAZ\files\frontend
npm install        # один раз
npm run dev        # поднимает фронт на http://localhost:5173



Открываешь браузер:
http://localhost:5173 → проверяешь каталог, переход в товар, избранное и т.д.
В этом режиме можешь вообще не трогать Telegram — просто отлаживаешь логику.





ГЛОБАЛ ПУШ
git add .
git commit -m "Изменения backend + frontend"
git push origin main