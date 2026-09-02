@echo off
cd /d C:\disasterready
echo Starting DisasterReady preview server on http://127.0.0.1:4173/
npx vite preview --port 4173 --host 127.0.0.1
pause
