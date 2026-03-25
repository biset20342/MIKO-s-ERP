#!/bin/bash
# 取得目前腳本所在目錄，確保在任何地方雙擊都能切換到正確的專案資料夾
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "======================================"
echo "啟動 MIKO-s-ERP 伺服器 (Mac 版)"
echo "請勿關閉此視窗，否則系統將會中斷。"
echo "若要結束，可按 Control + C 或直接關閉視窗。"
echo "======================================"

# 啟動 Node.js 伺服器
npm start
