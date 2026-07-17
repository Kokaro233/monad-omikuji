# Monad Omikuji｜链上御神签

[English](./README.md) | **中文**

[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript 5.9](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Solidity 0.8](https://img.shields.io/badge/Solidity-0.8-363636?logo=solidity&logoColor=white)](https://soliditylang.org/)
[![Monad Testnet](https://img.shields.io/badge/Monad-Testnet-836EF9)](https://docs.monad.xyz/)
[![Supabase](https://img.shields.io/badge/Supabase-认证与数据库-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/部署-Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com/)

Monad Omikuji 是一款运行于 Monad Testnet 的像素风链上抽签 DApp。访客可以进入月下神社，完成祈愿仪式，抽取七级御神签，将结果记录在链上，并把认领后的签文收入个人御签阁。

## 项目预览

[![Monad Omikuji 桌面端项目预览](./public/readme-preview.jpg)](https://monad-omikuji.vercel.app/)

**[进入线上神社体验 →](https://monad-omikuji.vercel.app/)**

## 产品体验

- 桌面与手机双端适配的沉浸式神社场景。
- 动态巫女、飘落樱花、灯笼微光与粒子效果。
- 完整仪式状态：祈祷、摇签筒、签棒出现、钱包确认、链上确认、签纸翻转与稀有度揭晓。
- 七级签运：大吉、中吉、小吉、吉、末吉、凶、大凶。
- SSR / SR / R 稀有度，以及事业、姻缘、财运评级。
- RPG 背包风御签收藏、参拜者档案与钱包认领流程。
- 每个钱包按 UTC 自然日最多抽取十签；未连接钱包的访客可在当前设备体验五次。

## 重要演示说明

本项目面向 Monad Testnet 与学习展示，不涉及真实资产，也不提供收费占卜服务。

当智能合约或 Supabase 配置不完整时，网站会进入带有明确标识的独立 Demo 模式。真实交易失败时不会静默降级为模拟成功。

## 项目结构

```text
src/                    React + TypeScript 前端
app/globals.css         像素风响应式设计系统
public/assets/          神社、巫女与 UI 美术素材
contracts/              Solidity 御神签合约
ignition/               Hardhat 部署模块
supabase/migrations/    用户、钱包、签文、nonce 与 RLS
supabase/functions/     钱包签名及交易验证函数
tests/                  签运映射与 Demo 模式测试
```

## 本地运行

需要 Node.js 22.13 或更高版本。

```bash
npm install
cp .env.example .env.local
npm run dev
```

打开终端显示的 Vite 地址。云端配置为空时会自动进入 Demo 模式。

```bash
npm run typecheck
npm test
npm run build
npm run contract:check
```

## 环境变量

以下前端安全变量需要配置在 `.env.local` 和 Vercel：

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_CONTRACT_ADDRESS=
VITE_MONAD_RPC_URL=https://testnet-rpc.monad.xyz
VITE_MONAD_EXPLORER_URL=https://testnet.monadexplorer.com
VITE_WALLETCONNECT_PROJECT_ID=
VITE_ENABLE_GOOGLE_AUTH=false
VITE_DEMO_MODE=false
```

私钥和 Supabase `service_role` 密钥绝不能放进 `VITE_` 开头的变量。

## 智能合约部署

`FortuneContract` 提供 `drawFortune`、`canDraw`、`getLatestFortune` 和抽签记录读取接口，发出 `FortuneDrawn` 事件，并限制每个钱包按 UTC 自然日最多抽取十次。

当前 Monad Testnet 部署：

```text
合约地址：0x3b31775c81d0da5ca59574d29c1bf86a6fda4993
部署交易：0x5912c2797e7e504c22338ce2c67acc10bc6adc3438a50979c43b8ea9895d8610
区块高度：45675840
```

[在 Monad Explorer 查看已部署合约](https://testnet.monadexplorer.com/address/0x3b31775c81d0da5ca59574d29c1bf86a6fda4993)

在不会提交到 Git 的本地 `.env` 中填写：

```env
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
MONAD_PRIVATE_KEY=0x_你的测试网部署钱包私钥
```

执行：

```bash
npm run contract:compile
npm run test:contract
npm run contract:deploy
```

部署完成后，将合约地址写入 `VITE_CONTRACT_ADDRESS`，并添加到 Supabase Edge Function 的 `CONTRACT_ADDRESS` secret。

当前演示随机数由 `block.prevrandao`、时间戳、调用者和抽签次数组合生成，只适合无经济价值的演示。若用于生产环境，应改用可验证随机数。

## Supabase 部署

1. 创建 Supabase 项目。
2. 执行 `supabase/migrations/202607170001_monad_omikuji.sql`。
3. 在 **Authentication → Providers → Email** 开启邮箱登录与注册。
4. 在 **Authentication → Email Templates → Magic Link** 中，将模板正文替换为 `supabase/templates/magic-link.html` 的内容。模板必须保留 `{{ .Token }}`，这样邮件会显示 6 位验证码，而不是只显示跳转链接。
5. 将邮件标题设置为 `{{ .Token }}｜Monad Omikuji 登录验证码`。验证码有效期为 10 分钟；`supabase/config.toml` 已记录对应的本地配置。
6. 如需 Google 登录，配置 OAuth 并设置 `VITE_ENABLE_GOOGLE_AUTH=true`。
7. 部署 `supabase/functions/wallet-claim`。
8. 为函数添加 `SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`、`MONAD_RPC_URL` 和 `CONTRACT_ADDRESS` secrets。

前端已经实现“获取邮箱验证码 → 输入 6 位验证码 → 验证并登录”的完整界面。线上是否能收到数字验证码，取决于 Supabase 控制台中的邮件模板是否包含 `{{ .Token }}`；仅把 `supabase/config.toml` 上传到 GitHub 不会自动改动云端项目。

验证函数会核对登录用户、一次性 nonce、签名钱包、合约地址、成功的交易回执和 `FortuneDrawn` 事件，然后才会完成签文认领。

## Vercel 部署

```text
Framework Preset: Vite
Root Directory: ./
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

为 Preview 与 Production 添加前端环境变量，并把 Vercel 域名加入 Supabase Auth 的重定向地址。

## 安全说明

- 钱包签名只用于证明地址归属，不会申请代币支出权限。
- nonce 十分钟后失效且只能使用一次。
- RLS 隔离每位用户的资料、钱包和签文。
- 钱包绑定和签文写入只能由服务端验证函数完成。
- 服务端会重新读取 Monad 交易，忽略客户端自行提交的签运数据。

## 当前验证状态

项目已通过 TypeScript 类型检查、4 项单元测试、Vite 生产构建与 Solidity 字节码编译检查。
