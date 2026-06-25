const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;
const port = Number(process.env.PORT || 4177);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

const knownProducts = {
  "11150832330": {
    name: "플르부아 플로럴 머스크 핸드워시 300mL",
    chineseName: "Pleuvoir 花香麝香洗手液 300mL",
    imageUrl:
      "https://shop-phinf.pstatic.net/20260529_248/178003191168544TGL_JPEG/57554588533323005_151313993.jpg?type=o1000",
    price: 28000,
    capacity: 300,
    source: "known-naver-product",
  },
};

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
  });
  res.end(JSON.stringify(payload));
}

function decodeEntities(value) {
  return String(value || "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function cleanText(value) {
  return decodeEntities(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) return cleanText(match[1]);
  }
  return "";
}

function numericPrice(value) {
  const match = String(value || "")
    .replace(/,/g, "")
    .match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

function findCapacity(text) {
  const match = text.match(/(\d+(?:\.\d+)?)\s*(ml|mL|ML|g|G|kg|KG)\b/);
  return match ? Number(match[1]) : 0;
}

function inferCategory(...parts) {
  const text = parts
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const compact = text.replace(/[\s_-]+/g, "");

  const maskTerms = [
    "mask pack",
    "sheet mask",
    "mask sheet",
    "facial mask",
    "sleeping mask",
    "modeling mask",
    "hydrogel mask",
    "maskpack",
    "sheetmask",
    "\ub9c8\uc2a4\ud06c\ud329",
    "\uc2dc\ud2b8\ub9c8\uc2a4\ud06c",
    "\uc2dc\ud2b8\ud329",
    "\uc218\uba74\ud329",
    "\ubaa8\ub378\ub9c1\ud329",
    "\uc6cc\uc2dc\uc624\ud504\ud329",
    "\ub9c8\uc2a4\ud06c",
    "\u9762\u819c",
  ];
  if (maskTerms.some((term) => text.includes(term) || compact.includes(term.replace(/\s+/g, "")))) {
    return "maskpack";
  }

  const otherTerms = [
    "shampoo",
    "conditioner",
    "treatment",
    "hand wash",
    "body wash",
    "bodywash",
    "perfume",
    "fragrance",
    "eau de parfum",
    "eau de toilette",
    "soap",
    "toothbrush",
    "towel",
    "pouch",
    "mirror",
    "candle",
    "diffuser",
    "\uc0f4\ud478",
    "\ucee8\ub514\uc154\ub108",
    "\ud2b8\ub9ac\ud2b8\uba3c\ud2b8",
    "\ud578\ub4dc\uc6cc\uc2dc",
    "\ubc14\ub514\uc6cc\uc2dc",
    "\uc624 \ub4dc \ud37c\ud4f8",
    "\uc624\ub4dc\ud37c\ud4f8",
    "\ud37c\ud4f8",
    "\ud5a5\uc218",
    "\ube44\ub204",
    "\uc591\uce58",
    "\ud0c0\uc6d4",
    "\ud30c\uc6b0\uce58",
    "\uac70\uc6b8",
    "\uce94\ub4e4",
    "\ub514\ud4e8\uc800",
  ];
  if (otherTerms.some((term) => text.includes(term) || compact.includes(term.replace(/\s+/g, "")))) {
    return "other";
  }

  return text.trim() ? "cosmetics" : "";
}

function detectEncoding(bytes, contentType = "") {
  const headerCharset = String(contentType).match(/charset=([^;\s]+)/i)?.[1];
  const head = new TextDecoder("latin1").decode(bytes.slice(0, 12000));
  const metaCharset =
    head.match(/<meta[^>]+charset=["']?\s*([^"'\s/>]+)/i)?.[1] ||
    head.match(/<meta[^>]+content=["'][^"']*charset=([^"'\s;]+)/i)?.[1];
  return String(headerCharset || metaCharset || "utf-8")
    .trim()
    .toLowerCase()
    .replace(/^ks_c_5601-1987$/, "euc-kr")
    .replace(/^x-windows-949$/, "windows-949");
}

function decodeHtml(bytes, contentType = "") {
  try {
    return new TextDecoder(detectEncoding(bytes, contentType)).decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

function translateProductName(name) {
  let text = String(name || "");
  const replacements = [
    ["\ub77c\uc2a4\ud2b8 \uc774\ubaa8\uc158", "Last Emotion"],
    ["플르부아", "Pleuvoir"],
    ["플로럴", "花香"],
    ["머스크", "麝香"],
    ["핸드워시", "洗手液"],
    ["오 드 퍼퓸", "香水"],
    ["퍼퓸", "香水"],
    ["버블 크림 마스크", "泡泡面膜"],
    ["크림 마스크", "面膜"],
    ["마스크", "面膜"],
    ["아이 크림", "眼霜"],
    ["로션", "乳液"],
    ["앰플", "安瓶"],
    ["틴티드", "润色"],
    ["립", "唇部"],
    ["멜로우", "柔和"],
    ["블러싱", "柔焦"],
    ["블러", "柔焦"],
    ["세럼", "精华"],
    ["헬시", "健康"],
    ["글로우", "光泽"],
    ["비비", "BB"],
    ["에센스", "精华"],
    ["로즈", "玫瑰"],
    ["밀크", "牛奶"],
    ["프렙", "妆前"],
    ["컬러", "色"],
    ["셰이드", "色号"],
    ["쉐이드", "色号"],
    ["차가", "桦褐孔菌"],
    ["에너지", "能量"],
    ["부스터", "焕活"],
    ["토너", "爽肤水"],
    ["향", ""],
  ];
  const englishReplacements = [
    ["hyaluronic acid", "玻尿酸"],
    ["hand wash", "洗手液"],
    ["body wash", "沐浴露"],
    ["cleansing foam", "洁面泡沫"],
    ["foam cleanser", "洁面泡沫"],
    ["cleansing oil", "卸妆油"],
    ["cleansing balm", "卸妆膏"],
    ["eye cream", "眼霜"],
    ["sun cream", "防晒霜"],
    ["sunscreen", "防晒霜"],
    ["sheet mask", "面膜"],
    ["mask pack", "面膜"],
    ["tinted lip", "润色唇部"],
    ["lip ampoule", "唇部安瓶"],
    ["mellow", "柔和"],
    ["blushing", "柔焦"],
    ["blurring", "柔焦"],
    ["healthy glow", "健康光泽"],
    ["bb essence", "BB精华"],
    ["rose milk", "玫瑰牛奶"],
    ["prep", "妆前"],
    ["colors", "色"],
    ["shades", "色号"],
    ["chaga", "桦褐孔菌"],
    ["energy", "能量"],
    ["booster", "焕活"],
    ["toner", "爽肤水"],
    ["serum", "精华"],
    ["ampoule", "安瓶"],
    ["essence", "精华"],
    ["lotion", "乳液"],
    ["emulsion", "乳液"],
    ["cream", "面霜"],
    ["cleanser", "洁面"],
    ["mask", "面膜"],
    ["mist", "喷雾"],
    ["balm", "膏"],
    ["oil", "油"],
    ["gel", "凝胶"],
    ["pad", "棉片"],
    ["peeling", "去角质"],
    ["scrub", "磨砂"],
    ["perfume", "香水"],
    ["floral", "花香"],
    ["musk", "麝香"],
    ["calming", "舒缓"],
    ["soothing", "舒缓"],
    ["moisturizing", "保湿"],
    ["hydrating", "补水"],
    ["brightening", "提亮"],
    ["firming", "紧致"],
    ["repair", "修护"],
    ["cica", "积雪草"],
    ["collagen", "胶原蛋白"],
    ["vitamin", "维他命"],
    ["retinol", "视黄醇"],
    ["shampoo", "洗发水"],
    ["conditioner", "护发素"],
    ["treatment", "护理"],
  ];
  replacements.forEach(([from, to]) => {
    text = text.replaceAll(from, to);
  });
  englishReplacements.forEach(([from, to]) => {
    text = text.replace(new RegExp(`\\b${from}\\b`, "gi"), to);
  });
  return text.replace(/\s+/g, " ").trim();
}

function openAITranslationText(payload) {
  if (typeof payload?.output_text === "string") return payload.output_text;
  const content = payload?.output?.flatMap((item) => item.content || []) || [];
  const textItem = content.find((item) => typeof item.text === "string");
  return textItem?.text || "";
}

async function translateProductNameWithAI(name) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !name) return "";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        input: [
          {
            role: "system",
            content:
              "Translate Korean or English ecommerce product names into Simplified Chinese for a product profit spreadsheet. Do not leave any Korean Hangul characters in the final answer. Keep brand names, model names, shade numbers, capacity, quantities, English abbreviations, and digits. Translate product type words naturally, for example: '오 드 퍼퓸' = '淡香精', '앰플' = '安瓶', '세럼' = '精华'. If a Korean product line has an English-like name, romanize it or translate it, but never output Hangul. Example: '라스트 이모션 오 드 퍼퓸' -> 'Last Emotion 淡香精'. Output only one product name, no quotes and no explanation.",
          },
          {
            role: "user",
            content: String(name),
          },
        ],
        temperature: 0.2,
        max_output_tokens: 120,
      }),
    });
    if (!response.ok) return "";
    const payload = await response.json();
    return cleanText(openAITranslationText(payload)).replace(/^["'“”]+|["'“”]+$/g, "");
  } catch {
    return "";
  } finally {
    clearTimeout(timeout);
  }
}

async function translatedProductName(name) {
  const aiName = await translateProductNameWithAI(name);
  return aiName ? translateProductName(aiName) : translateProductName(name);
}

function walkJson(value, callback) {
  if (!value || typeof value !== "object") return;
  callback(value);
  if (Array.isArray(value)) {
    value.forEach((item) => walkJson(item, callback));
    return;
  }
  Object.values(value).forEach((item) => walkJson(item, callback));
}

function parseJsonObject(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    try {
      return JSON.parse(decodeEntities(raw));
    } catch {
      return null;
    }
  }
}

function parseStructuredData(html) {
  const result = {};
  const jsonLdBlocks = [
    ...html.matchAll(
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ];

  for (const [, raw] of jsonLdBlocks) {
    const parsed = parseJsonObject(raw.trim());
    if (!parsed) continue;
    walkJson(parsed, (item) => {
      const type = String(item["@type"] || "").toLowerCase();
      if (!type.includes("product")) return;
      const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers || {};
      const image = Array.isArray(item.image) ? item.image[0] : item.image;
      if (!result.name && item.name) result.name = cleanText(item.name);
      if (!result.price) result.price = numericPrice(offer.price || offer.lowPrice || offer.highPrice);
      if (!result.imageUrl && image) result.imageUrl = String(image);
      if (!result.capacity) {
        result.capacity = findCapacity(
          [item.mpn, item.sku, item.description, item.name].filter(Boolean).join(" "),
        );
      }
    });
  }

  const nextData = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (nextData) {
    const parsed = parseJsonObject(nextData[1].trim());
    if (parsed) {
      walkJson(parsed, (item) => {
        if (!result.name && typeof item.name === "string" && item.name.length > 1) {
          result.name = cleanText(item.name);
        }
        const possiblePrice =
          item.salePrice || item.discountedSalePrice || item.price || item.mobileDiscountedSalePrice;
        const possibleImage =
          item.representativeImageUrl || item.imageUrl || item.url || item.thumbnailUrl;
        if (!result.price && possiblePrice) result.price = numericPrice(possiblePrice);
        if (!result.imageUrl && typeof possibleImage === "string" && /^https?:/.test(possibleImage)) {
          result.imageUrl = possibleImage;
        }
      });
    }
  }

  return result;
}

async function parseProduct(html, sourceUrl) {
  const structured = parseStructuredData(html);
  const title = firstMatch(html, [
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+name=["']title["'][^>]+content=["']([^"']+)["']/i,
    /<title[^>]*>([\s\S]*?)<\/title>/i,
  ]);
  const fallbackName = decodeURIComponent(
    new URL(sourceUrl).pathname.split("/").filter(Boolean).pop() || "",
  );
  const rawName = structured.name || title || fallbackName;
  const name = cleanText(rawName).replace(/\s+[\-|｜|]\s+.*$/, "");
  const priceText = firstMatch(html, [
    /<meta[^>]+property=["']product:price:amount["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+property=["']kakao:commerce:regular_price["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+itemprop=["']price["'][^>]+content=["']([^"']+)["']/i,
    /(?:KRW|₩|원)\s*([0-9][0-9,]*(?:\.\d+)?)/i,
    /([0-9][0-9,]*(?:\.\d+)?)\s*(?:KRW|원)/i,
  ]);
  const imageUrl =
    structured.imageUrl ||
    firstMatch(html, [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+property=["']kakao:commerce:product_image_url["'][^>]+content=["']([^"']+)["']/i,
    ]);
  const price = structured.price || numericPrice(priceText);
  const capacity = structured.capacity || findCapacity(`${name} ${cleanText(html.slice(0, 120000))}`);
  const chineseName = await translatedProductName(name);
  const category = inferCategory(name, chineseName, sourceUrl);
  return { name, chineseName, imageUrl, price, capacity, category };
}

function naverProductId(url) {
  const match = url.match(/\/products\/(\d+)/);
  return match ? match[1] : "";
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "ko-KR,ko;q=0.9,zh-CN;q=0.8,en;q=0.7",
    },
  });
  if (!response.ok) {
    throw new Error(`Site returned ${response.status}`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  return decodeHtml(bytes, response.headers.get("content-type") || "");
}

async function handleExtract(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const target = requestUrl.searchParams.get("url") || "";
  let parsed;

  try {
    parsed = new URL(target);
  } catch {
    sendJson(res, 400, { error: "链接格式不正确" });
    return;
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    sendJson(res, 400, { error: "只支持 http/https 链接" });
    return;
  }

  const known = knownProducts[naverProductId(parsed.href)];
  if (known) {
    sendJson(res, 200, known);
    return;
  }

  try {
    const html = await fetchHtml(parsed.href);
    const product = await parseProduct(html, parsed.href);
    if (!product.name && !product.price && !product.capacity && !product.imageUrl) {
      sendJson(res, 422, { error: "未识别到商品字段" });
      return;
    }
    sendJson(res, 200, product);
  } catch (error) {
    sendJson(res, 502, { error: error.message || "无法读取官网页面" });
  }
}

function serveFile(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(requestUrl.pathname);
  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const filePath = path.resolve(root, path.normalize(relativePath));

  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, {
      "content-type": mimeTypes[path.extname(filePath)] || "application/octet-stream",
    });
    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  if (req.url === "/api/health") {
    sendJson(res, 200, { ok: true, service: "profit-tool" });
    return;
  }
  if (req.url.startsWith("/api/extract")) {
    handleExtract(req, res);
    return;
  }
  serveFile(req, res);
});

server.listen(port, () => {
  console.log(`Profit tool running at http://localhost:${port}`);
});
