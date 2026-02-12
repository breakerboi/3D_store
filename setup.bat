@echo off
echo Установка зависимостей...
call npm install
if %errorlevel% neq 0 (
    echo Ошибка при установке зависимостей!
    pause
    exit /b %errorlevel%
)

echo Запуск сервера разработки...
echo Сервер запустится на http://localhost:3000
echo После полной загрузки браузер откроется автоматически...
echo.
echo Чтобы остановить сервер, закройте это окно или нажмите Ctrl+C
echo.
timeout /t 3 /nobreak >nul

echo Запуск сервера разработки...
start "" chrome "http://localhost:3000"
call npm run dev -- --host 0.0.0.0 --port 3000

