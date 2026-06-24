# 入驻商品利润模拟工具

입점 상품 마진 시뮬레이션

这是一个可发布的 Node.js 小工具，包含前端页面和产品链接提取接口。页面用于录入官网链接、供货价、淘宝价格和品类，并自动计算韩国售价人民币、供货率、利润、税率和税金。

## 本地运行

需要 Node.js 18 或更高版本。

```bash
npm start
```

默认地址：

```text
http://localhost:4177
```

Windows 也可以双击：

```text
start-windows.bat
```

## 修改端口

```bash
PORT=3000 npm start
```

Windows PowerShell：

```powershell
$env:PORT=3000
npm start
```

## 云服务器部署

把整个目录上传到服务器后执行：

```bash
npm start
```

如果部署平台支持 Node.js，例如 Render、Railway、Fly.io、公司服务器或 VPS：

- Build Command: 留空或使用 `npm install`
- Start Command: `npm start`
- Node Version: 18+
- Health Check Path: `/api/health`

## Docker 部署

```bash
docker build -t profit-simulation-tool .
docker run -p 4177:4177 profit-simulation-tool
```

## 注意

部分韩国电商网站会限制服务器直接抓取网页。工具已经支持通用网页结构提取，并对已测试的 Naver 商品做了缓存兜底；如果某些链接提取失败，可以继续手动填写产品名、售价和容量。
