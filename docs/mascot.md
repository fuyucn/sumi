# Sumi 墨 — 二次元少女形象设定（Mascot Design）

> Status: v1.0 · Character brief + ready-to-run image prompts
> 说明：本文档是「墨 Sumi」官方看板娘的形象设定与出图规范。图像生成工具
> 就绪后，直接使用文末的 Prompt 出图；内置 `image_gen` 与 CLI 兜底通用。

## 1. 角色档案

| 项 | 设定 |
|---|---|
| 名字 | 墨墨 / Sumi-chan（英文名 Sumi，与品牌同名） |
| 昵称 | 墨酱、Sumi、小墨 |
| 定位 | Sumi 个人空间的「看板娘」：书桌前的记录者、墨水精灵 |
| 性格 | 安静、温柔、有点小认真；爱写字、爱整理、偶尔犯困 |
| 台词倾向 | 「今天也要好好写字哦。」「这是只属于你的空间。」 |
| 世界观 | 诞生于研墨的瞬间：和纸、松烟墨与一点朱砂凝成的小精灵 |

## 2. 视觉语言（严格对应品牌色板）

品牌色板来自 `src/app/globals.css`，角色所有配色必须取自下表，禁止引入
偏离品牌的新色相（如紫色、荧光色）：

| 品牌 Token | 色值 | 角色用途 |
|---|---|---|
| `--color-ink` | `#1e1b16` | 发色主色、眼瞳、描线 |
| `--color-ink-soft` | `#4a453d` | 发丝内层、阴影 |
| `--color-paper` | `#f7f4ec` | 肤色的高光基调、和服/连衣裙主色 |
| `--color-paper-deep` | `#efe9dc` | 衣服阴影、领口 |
| `--color-seal` | `#b3402e` | 发饰、腰带、印章挂坠、腮红 |
| `--color-seal-soft` | `#c45a44` | 衣摆渐变、缎带亮部 |

## 3. 形象细案

### 3.1 整体剪影
- 少女体型，约 14–16 岁观感，圆润脸型 + 大眼睛，**二次元赛璐璐/厚涂之间**的
  现代插画风（参考当下社交平台常见的日系角色立绘，非 Q 版三头身）。
- 半身立绘为主（用于 404、登录页、空状态），全身立绘为辅。

### 3.2 发型
- 中长发到腰，墨黑（`#1e1b16`）为主，发梢有极淡的蓝灰渐变（不偏离色板，
  用 ink-soft 做内层阴影即可）。
- 两侧各一绺过肩发丝；额前空气刘海 + 一小撮呆毛。
- 发饰：右侧别一枚**朱砂色（seal）流苏发簪**，流苏尾端缀一颗小墨珠。

### 3.3 五官与表情
- 眼睛大而圆，墨色虹膜，高光呈两点；眼神安静专注。
- 默认表情：微微笑 + 稍微认真的眼神；可扩展表情见 §4。

### 3.4 服装（首选方案：和风连衣裙）
- 主体为和纸暖白（paper）的无袖/短袖连衣裙，胸前一排**墨色纽扣**，
  裙摆印有淡淡的**墨点晕染**图案（墨水渍，非卡通印花）。
- 腰带：朱砂红（seal）宽腰带，侧边系一个蝴蝶结，尾端垂下一枚
  **方形朱印挂坠**（红色小方块，像 hanko 印章，可刻一个白色「墨」字）。
- 袜子与鞋：米白堆堆袜 + 深棕（ink-soft）乐福鞋。

### 3.5 道具（随场景可选）
- **毛笔**（执笔，笔尖蘸墨）。
- **砚台/墨锭**：墨锭上可画一个极简的 Sumi 手写 logo 轮廓。
- **笔记本/和纸信笺**：封皮墨色，页角有 paper 色的纸张分层。
- **墨滴**：身旁漂浮 1–2 滴小墨滴，作为「墨水精灵」的暗示。

### 3.6 构图与背景
- 背景：和纸肌理（paper 底 + 细墨线晕染），中央留白、角色居中偏左，
  右侧留出文字/按钮的空间（用于 404 与登录页）。
- 轻微日式窗光（左侧来光），暖色调，投影柔和。
- 禁止：真实照片质感、3D 渲染、描边过重的美式卡通、任何真实品牌 logo。

## 4. 表情库（扩展用）

- `calm` 默认微笑（首发出图）
- `focus` 认真写字、微微皱眉
- `sleepy` 犯困揉眼睛（空状态可用）
- `happy` 眯眼笑、双手捧脸（「发布成功」反馈可用）

## 5. 使用场景

| 场景 | 规格 | 说明 |
|---|---|---|
| 404 页 | 半身立绘 + 右侧文案 | 现已存在 `sumi-404.png`，可替换 |
| 登录页 | 半身立绘 | 头像旁展示角色 |
| 首页 Hero | 全身/半身点缀 | 与手写 logo 呼应 |
| 空状态 | 表情变体 | 无文章、无评论时展示 |

## 6. 出图 Prompt（可直接使用）

> 工具就绪后直接执行：内置 `image_gen`（默认）；如需 CLI 兜底则
> `python ~/.codex/skills/.system/imagegen/scripts/image_gen.py generate --use-case stylized-concept ...`。

### 6.1 中文 Prompt

```text
二次元日系插画风格的少女看板娘立绘，半身构图，角色居中偏左，右侧留白。
圆润脸型，大眼睛，墨黑色中长发到腰，空气刘海与呆毛，两侧过肩发丝。
右侧发间别一支朱砂红色流苏发簪，流苏尾端坠一颗墨珠。
表情安静温柔，嘴角微微上翘，眼神专注，墨色虹膜带两点高光。
身穿和纸暖白色无袖连衣裙，胸前墨色纽扣，裙摆有淡淡的墨点晕染花纹；
腰间朱砂红色宽腰带，侧边蝴蝶结垂下方形朱印挂坠（红色小方块，中央白色"墨"字）。
米白堆堆袜，深棕乐福鞋。手执毛笔，笔尖蘸墨；身旁漂浮两滴小墨滴。
背景为和纸肌理暖白底，细墨线晕染，左侧暖色窗光，柔和投影。
配色严格限定：墨黑 #1e1b16、暖纸白 #f7f4ec、朱砂红 #b3402e、米黄阴影 #efe9dc。
风格：现代日系角色立绘，赛璐璐与厚涂之间，线条干净，避免 Q 版三头身。
禁止：真实照片、3D 渲染、美式卡通描边、荧光色、任何真实品牌 logo 与文字。
```

### 6.2 English Prompt（recommended for models）

```text
Use case: stylized-concept
Asset type: mascot hero illustration for the "Sumi" personal-space web app
Primary request: half-body anime girl mascot standing slightly left of center,
  with clean negative space on the right for copy/buttons
Subject: teenage girl, round soft face, big calm eyes, ink-black long hair to
  the waist with airy bangs and a single ahoge, two shoulder strands; a
  vermilion tassel hairpin on the right side tipped with a small ink bead
Expression: gentle quiet smile, focused gaze, black iris with two highlights
Outfit: washi-paper cream sleeveless dress (#f7f4ec) with ink-black buttons and
  faint ink-splash pattern on the skirt; vermilion wide sash (#b3402e) with a
  side bow hanging a small square hanko seal charm (red block, white "墨"
  character); cream socks and dark-brown loafers
Props: holding a calligraphy brush with fresh ink on the tip; two small floating
  ink drops beside her
Scene/backdrop: warm washi-paper texture background with delicate ink-line
  washes; soft warm window light from the left; gentle shadows
Color palette: strictly sumi ink #1e1b16, washi paper #f7f4ec, cinnabar seal
  #b3402e, paper-deep #efe9dc; no off-brand hues
Style/medium: modern Japanese anime illustration, clean cel-plus-painterly
  rendering, not chibi
Composition/framing: half body, character slightly left, right side reserved
Lighting/mood: warm, quiet, cozy, focused
Constraints: no text except the white "墨" on the seal charm; no logos, no
  watermark, no photorealism, no 3D render, no heavy cartoon outlines
Avoid: neon colors, chibi proportions, western cartoon style, brand logos
```

## 7. 出图后处理（交付规范）

1. 产出图复制到 `public/mascot/sumi-mascot-v1.png`（项目内资源必须落在
   仓库，不能只留在 `~/.codex/generated_images/`）。
2. 透明化（二选一）：
   - **首选：直接提供透明 PNG**（工具已去背景，P 模式带 alpha 即可）。
     只做缩放 + 转 WebP，不做任何抠图/裁切：
     `python scripts/mascot-cutout.py --src <透明图.png>`（检测到 alpha
     时跳过抠图，仅转换）；或手工用 PIL：长边 1200、LANCZOS、
     WebP quality=92 / alpha_quality=92 / method=6。
   - **兜底：白底 RGB 图**才需要抠图。脚本做边缘连通域 flood-fill +
     形态学去噪点 + 温和 despill，避免旧版「幽灵框」问题（半透明米黄
     噪点）。输出透明 PNG + WebP（`sumi-mascot-v1.webp` 为主资产）。
3. 校验：四角 alpha=0、透明占比与原图一致（约 70%+）、webp 与源图
   逐像素差异 <5%（有损压缩正常）。用 PIL 统计即可。
4. 主页融入方式：透明立绘绝对定位在 hero featured 卡左后探出
   （`src/app/page.tsx`），`pointer-events-none` 不挡交互，`lg` 以下隐藏。
5. 如需替换 404 / 登录页 / 空状态的使用点，改路径后重新部署 Docker。
