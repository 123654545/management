#!/bin/bash

echo "🚀 启动智能合同管理系统开发环境"

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js"
    exit 1
fi

echo "✅ Node.js 版本: $(node --version)"

# 启动后端
echo "🔧 启动后端服务..."
cd backend
if ! [ -f ".env" ]; then
    echo "❌ 后端 .env 文件不存在"
    exit 1
fi

# 运行健康检查
echo "🔍 检查后端配置..."
node check-health.js
if [ $? -ne 0 ]; then
    echo "❌ 后端配置检查失败，请修复后再启动"
    exit 1
fi

# 启动后端服务（后台运行）
echo "🚀 启动后端服务（端口 5000）..."
npm run dev &
BACKEND_PID=$!

# 等待后端启动
sleep 3

# 启动前端
echo "🎨 启动前端服务（端口 3000）..."
cd ..

if ! [ -f ".env" ]; then
    echo "❌ 前端 .env 文件不存在"
    kill $BACKEND_PID
    exit 1
fi

npm run dev &
FRONTEND_PID=$!

echo "✅ 服务启动完成!"
echo "📍 前端地址: http://localhost:3000"
echo "📍 后端地址: http://localhost:5000"
echo "📍 健康检查: http://localhost:5000/health"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 等待用户中断
trap "echo '🛑 停止服务...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait