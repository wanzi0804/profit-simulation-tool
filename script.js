const defaultRows = [{ category: "cosmetics" }];

const fields = [
  "productUrl",
  "imageUrl",
  "category",
  "capacity",
  "chineseName",
  "name",
  "krwRetail",
  "krwSupply",
  "taobaoPrice",
  "taobaoLowPrice",
];

const exportHeaders = {
  imageUrl: "产品图",
  category: "品类",
  capacity: "容量",
  chineseName: "中文产品名",
  name: "韩文产品名",
  krwRetail: "韩国售价(KRW)",
  cnyRetail: "韩国售价(CNY)",
  krwSupply: "供货价(KRW)",
  cnySupply: "供货价(CNY)",
  supplyRate: "供货率",
  taobaoPrice: "淘宝原价(CNY)",
  taobaoLowPrice: "淘宝最低价(CNY)",
  normalProfit: "原价利润(CNY)",
  normalProfitRate: "原价利润率",
  discountProfit: "最低价利润(CNY)",
  discountProfitRate: "最低价利润率",
  normalTaxRate: "原价税率",
  normalTax: "原价税金(CNY)",
  discountTaxRate: "最低价税率",
  discountTax: "最低价税金(CNY)",
  productUrl: "官网链接",
};

const percentKeys = new Set([
  "supplyRate",
  "normalProfitRate",
  "discountProfitRate",
  "normalTaxRate",
  "discountTaxRate",
]);
const integerKeys = new Set(["capacity", "krwRetail", "krwSupply"]);
const cnyKeys = new Set([
  "cnyRetail",
  "cnySupply",
  "taobaoPrice",
  "taobaoLowPrice",
  "normalProfit",
  "discountProfit",
  "normalTax",
  "discountTax",
]);
const categoryLabels = {
  cosmetics: "化妆品",
  maskpack: "面膜",
  other: "其他",
};

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

const tbody = document.querySelector("#productRows");
const template = document.querySelector("#rowTemplate");
const addRowBtn = document.querySelector("#addRowBtn");
const addRowBottomBtn = document.querySelector("#addRowBottomBtn");
const captureModeBtn = document.querySelector("#captureModeBtn");
const saveRecordBtn = document.querySelector("#saveRecordBtn");
const importRecordBtn = document.querySelector("#importRecordBtn");
const recordFileInput = document.querySelector("#recordFileInput");
const exportBtn = document.querySelector("#exportBtn");
const exportExcelBtn = document.querySelector("#exportExcelBtn");
const settingInputs = [
  "#exchangeRate",
  "#krLogistics",
  "#freeShippingBase",
  "#taobaoPlatformRate",
  "#sellerRate",
].map((selector) => document.querySelector(selector));

function money(value) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

function percent(value) {
  return `${((Number.isFinite(value) ? value : 0) * 100).toFixed(1)}%`;
}

function roundedNumber(value) {
  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function roundedMoney(value) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function exportDisplayValue(key, value) {
  if (percentKeys.has(key)) return percent(value);
  if (cnyKeys.has(key)) return roundedMoney(value);
  if (integerKeys.has(key)) return roundedNumber(value);
  return value;
}

function numberValue(element) {
  const value = Number(element.value);
  return Number.isFinite(value) ? value : 0;
}

function settings() {
  return {
    exchangeRate: numberValue(document.querySelector("#exchangeRate")) || 1,
    krLogistics: numberValue(document.querySelector("#krLogistics")),
    freeShippingBase: numberValue(document.querySelector("#freeShippingBase")) || 1,
    taobaoPlatformRate:
      numberValue(document.querySelector("#taobaoPlatformRate")) / 100,
    sellerRate: numberValue(document.querySelector("#sellerRate")) / 100,
  };
}

function setSettings(config = {}) {
  const mapping = {
    exchangeRate: "#exchangeRate",
    krLogistics: "#krLogistics",
    freeShippingBase: "#freeShippingBase",
    taobaoPlatformRate: "#taobaoPlatformRate",
    sellerRate: "#sellerRate",
  };
  Object.entries(mapping).forEach(([key, selector]) => {
    if (config[key] === undefined || config[key] === null) return;
    document.querySelector(selector).value = config[key];
  });
}

function rateKind(category, unitAmount) {
  if (category === "cosmetics") return unitAmount < 10 ? "regular" : "premium";
  if (category === "maskpack") return unitAmount < 15 ? "regular" : "premium";
  return "regular";
}

function taxRate(kind) {
  return kind === "premium" ? 0.2305 : 0.091;
}

function cappedLogistics(price, config) {
  const calculated = config.krLogistics * (price / config.freeShippingBase);
  return calculated >= config.krLogistics ? config.krLogistics : calculated;
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

function rowData(row) {
  return Object.fromEntries(
    fields.map((field) => {
      const element = row.querySelector(`[data-field="${field}"]`);
      const isText = ["productUrl", "imageUrl", "category", "chineseName", "name"].includes(field);
      return [field, isText ? element.value.trim() : numberValue(element)];
    }),
  );
}

function calculate(row) {
  const config = settings();
  const data = rowData(row);
  const cnyRetail = data.krwRetail / config.exchangeRate;
  const cnySupply = data.krwSupply / config.exchangeRate;
  const supplyRate = data.krwRetail > 0 ? data.krwSupply / data.krwRetail : 0;

  const normalUnitAmount =
    data.capacity > 0 ? data.taobaoPrice / data.capacity : 0;
  const discountUnitAmount =
    data.capacity > 0 ? data.taobaoLowPrice / data.capacity : 0;
  const normalTaxRate = taxRate(rateKind(data.category, normalUnitAmount));
  const discountTaxRate = taxRate(rateKind(data.category, discountUnitAmount));
  const normalTax = data.taobaoPrice * normalTaxRate;
  const discountTax = data.taobaoLowPrice * discountTaxRate;

  const normalProfit =
    data.taobaoPrice -
    cnySupply -
    data.taobaoPrice * config.taobaoPlatformRate -
    data.taobaoPrice * config.sellerRate -
    cappedLogistics(data.taobaoPrice, config) -
    normalTax;

  const discountProfit =
    data.taobaoLowPrice -
    cnySupply -
    data.taobaoLowPrice * config.taobaoPlatformRate -
    data.taobaoLowPrice * config.sellerRate -
    cappedLogistics(data.taobaoLowPrice, config) -
    discountTax;
  const normalProfitRate = data.taobaoPrice > 0 ? normalProfit / data.taobaoPrice : 0;
  const discountProfitRate =
    data.taobaoLowPrice > 0 ? discountProfit / data.taobaoLowPrice : 0;

  return {
    ...data,
    category: categoryLabels[data.category] || data.category,
    cnyRetail,
    cnySupply,
    supplyRate,
    normalTaxRate,
    normalTax,
    discountTaxRate,
    discountTax,
    normalProfit,
    normalProfitRate,
    discountProfit,
    discountProfitRate,
  };
}

function setOutput(row, name, value, formatter) {
  const cell = row.querySelector(`[data-output="${name}"]`);
  cell.textContent = formatter(value);
  cell.classList.toggle("positive", value > 0 && name.includes("Profit"));
  cell.classList.toggle("negative", value < 0 && name.includes("Profit"));
}

function setStatus(row, text, state = "") {
  const status = row.querySelector('[data-output="status"]');
  status.textContent = text;
  status.dataset.state = state;
}

function syncImage(row) {
  const imageUrl = row.querySelector('[data-field="imageUrl"]').value.trim();
  const image = row.querySelector('[data-output="productImage"]');
  const placeholder = row.querySelector('[data-output="imagePlaceholder"]');
  image.src = imageUrl;
  image.hidden = !imageUrl;
  placeholder.hidden = Boolean(imageUrl);
}

function recalculate() {
  [...tbody.querySelectorAll("tr")].forEach((row) => {
    const data = calculate(row);
    syncImage(row);
    setOutput(row, "cnyRetail", data.cnyRetail, money);
    setOutput(row, "cnySupply", data.cnySupply, money);
    setOutput(row, "supplyRate", data.supplyRate, percent);
    setOutput(row, "normalProfit", data.normalProfit, money);
    setOutput(row, "normalProfitRate", data.normalProfitRate, percent);
    setOutput(row, "discountProfit", data.discountProfit, money);
    setOutput(row, "discountProfitRate", data.discountProfitRate, percent);
    setOutput(row, "normalTaxRate", data.normalTaxRate, percent);
    setOutput(row, "normalTax", data.normalTax, money);
    setOutput(row, "discountTaxRate", data.discountTaxRate, percent);
    setOutput(row, "discountTax", data.discountTax, money);
  });
}

function addRow(data = {}) {
  const fragment = template.content.cloneNode(true);
  const row = fragment.querySelector("tr");
  fields.forEach((field) => {
    row.querySelector(`[data-field="${field}"]`).value = data[field] ?? "";
  });
  tbody.appendChild(fragment);
  recalculate();
}

function currentRecord() {
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    settings: Object.fromEntries(
      settingInputs.map((input) => [input.id, numberValue(input)]),
    ),
    rows: [...tbody.querySelectorAll("tr")].map(rowData),
  };
}

function requestedFilename(extension) {
  const input = prompt("请输入保存文件名 / 저장할 파일명을 입력하세요", "");
  if (input === null) return null;
  const safeName = input.trim().replace(/[\\/:*?"<>|]+/g, "-");
  if (!safeName) {
    alert("请输入文件名 / 파일명을 입력하세요");
    return null;
  }
  const suffix = `.${extension}`;
  return safeName.toLowerCase().endsWith(suffix) ? safeName : `${safeName}${suffix}`;
}

function saveRecord() {
  const filename = requestedFilename("json");
  if (!filename) return;
  const blob = new Blob([JSON.stringify(currentRecord(), null, 2)], {
    type: "application/json;charset=utf-8",
  });
  downloadBlob(blob, filename);
}

function importRecordPayload(payload) {
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.rows)) {
    throw new Error("记录文件格式不正确");
  }
  setSettings(payload.settings || {});
  tbody.innerHTML = "";
  const rows = payload.rows.length ? payload.rows : [{ category: "cosmetics" }];
  rows.forEach((row) => addRow({ category: "cosmetics", ...row }));
  recalculate();
}

function importRecordFile(file) {
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      importRecordPayload(JSON.parse(reader.result));
    } catch (error) {
      alert(error.message || "导入失败");
    } finally {
      recordFileInput.value = "";
    }
  });
  reader.addEventListener("error", () => {
    alert("无法读取记录文件");
    recordFileInput.value = "";
  });
  reader.readAsText(file, "utf-8");
}

async function extractProduct(row) {
  const url = row.querySelector('[data-field="productUrl"]').value.trim();
  if (!url) {
    setStatus(row, "请先输入链接 / 링크를 먼저 입력하세요", "error");
    return;
  }

  const apiBase = location.protocol === "file:" ? "http://localhost:4177" : "";
  setStatus(row, "提取中 / 추출 중", "loading");
  try {
    const response = await fetch(`${apiBase}/api/extract?url=${encodeURIComponent(url)}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "提取失败 / 추출 실패");

    if (payload.imageUrl) row.querySelector('[data-field="imageUrl"]').value = payload.imageUrl;
    if (payload.name) row.querySelector('[data-field="name"]').value = payload.name;
    if (payload.chineseName) {
      row.querySelector('[data-field="chineseName"]').value = payload.chineseName;
    } else if (payload.name) {
      row.querySelector('[data-field="chineseName"]').value = translateProductName(payload.name);
    }
    const inferredCategory = payload.category || inferCategory(payload.name, payload.chineseName, url);
    if (inferredCategory) row.querySelector('[data-field="category"]').value = inferredCategory;
    if (payload.price) row.querySelector('[data-field="krwRetail"]').value = payload.price;
    if (payload.capacity) row.querySelector('[data-field="capacity"]').value = payload.capacity;

    const found = [
      payload.imageUrl ? "产品图" : "",
      payload.name ? "韩文产品名" : "",
      payload.chineseName || payload.name ? "中文名" : "",
      inferredCategory ? "品类" : "",
      payload.price ? "韩国售价" : "",
      payload.capacity ? "容量" : "",
    ].filter(Boolean);

    setStatus(
      row,
      found.length
        ? `已提取 / 추출 완료：${found.join(" / ")}`
        : "未识别到字段 / 인식된 항목 없음",
      found.length ? "ok" : "error",
    );
    recalculate();
  } catch (error) {
    const message = error.message || "提取失败 / 추출 실패";
    setStatus(row, message.includes("/") ? message : `${message} / 추출 실패`, "error");
  }
}

function exportRows() {
  const keys = Object.keys(exportHeaders);
  const rows = [[...keys.map((key) => exportHeaders[key])]];
  tbody.querySelectorAll("tr").forEach((row) => {
    const data = calculate(row);
    rows.push(
      keys.map((key) => {
        const value = data[key];
        return exportDisplayValue(key, value);
      }),
    );
  });
  return rows;
}

function formulaCell(formula, value = 0) {
  return { formula, value };
}

function excelImageCell(url) {
  const imageUrl = String(url || "").replaceAll('"', '""');
  return imageUrl ? formulaCell(`IMAGE("${imageUrl}")`, "") : "";
}

function excelRows() {
  const keys = Object.keys(exportHeaders);
  const rows = [[...keys.map((key) => exportHeaders[key])]];
  const config = settings();

  tbody.querySelectorAll("tr").forEach((row, index) => {
    const data = calculate(row);
    const r = index + 2;
    const normalTaxRateFormula = `IF(B${r}="化妆品",IF(K${r}/C${r}<10,9.1%,23.05%),IF(B${r}="面膜",IF(K${r}/C${r}<15,9.1%,23.05%),9.1%))`;
    const discountTaxRateFormula = `IF(B${r}="化妆品",IF(L${r}/C${r}<10,9.1%,23.05%),IF(B${r}="面膜",IF(L${r}/C${r}<15,9.1%,23.05%),9.1%))`;

    rows.push([
      excelImageCell(data.imageUrl),
      data.category,
      data.capacity,
      data.chineseName,
      data.name,
      data.krwRetail,
      formulaCell(`F${r}/${config.exchangeRate}`, data.cnyRetail),
      data.krwSupply,
      formulaCell(`H${r}/${config.exchangeRate}`, data.cnySupply),
      formulaCell(`IF(F${r}>0,H${r}/F${r},0)`, data.supplyRate),
      data.taobaoPrice,
      data.taobaoLowPrice,
      formulaCell(`K${r}-I${r}-K${r}*${config.taobaoPlatformRate}-K${r}*${config.sellerRate}-MIN(${config.krLogistics},${config.krLogistics}*K${r}/${config.freeShippingBase})-R${r}`, data.normalProfit),
      formulaCell(`IF(K${r}>0,M${r}/K${r},0)`, data.normalProfitRate),
      formulaCell(`L${r}-I${r}-L${r}*${config.taobaoPlatformRate}-L${r}*${config.sellerRate}-MIN(${config.krLogistics},${config.krLogistics}*L${r}/${config.freeShippingBase})-T${r}`, data.discountProfit),
      formulaCell(`IF(L${r}>0,O${r}/L${r},0)`, data.discountProfitRate),
      formulaCell(normalTaxRateFormula, data.normalTaxRate),
      formulaCell(`K${r}*Q${r}`, data.normalTax),
      formulaCell(discountTaxRateFormula, data.discountTaxRate),
      formulaCell(`L${r}*S${r}`, data.discountTax),
      data.productUrl,
    ]);
  });

  return rows;
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function exportCsv() {
  const filename = requestedFilename("csv");
  if (!filename) return;
  const lines = exportRows().map((row) => row.map(csvEscape).join(","));
  const blob = new Blob(["\ufeff", lines.join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  downloadBlob(blob, filename);
}

function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function columnName(index) {
  let name = "";
  let n = index + 1;
  while (n > 0) {
    const r = (n - 1) % 26;
    name = String.fromCharCode(65 + r) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

function styleIdForKey(key, isHeader) {
  if (isHeader) return 1;
  if (percentKeys.has(key)) return 4;
  if (cnyKeys.has(key)) return 3;
  if (integerKeys.has(key)) return 2;
  return 0;
}

function cellStyleAttribute(key, isHeader) {
  const styleId = styleIdForKey(key, isHeader);
  return styleId ? ` s="${styleId}"` : "";
}

function worksheetXml(rows) {
  const keys = Object.keys(exportHeaders);
  const sheetRows = rows
    .map((row, rowIndex) => {
      const isHeader = rowIndex === 0;
      const cells = row
        .map((value, colIndex) => {
          const ref = `${columnName(colIndex)}${rowIndex + 1}`;
          const style = cellStyleAttribute(keys[colIndex], isHeader);
          if (value && typeof value === "object" && "formula" in value) {
            const cached = Number.isFinite(value.value) ? value.value : 0;
            return `<c r="${ref}"${style}><f>${escapeXml(value.formula)}</f><v>${cached}</v></c>`;
          }
          if (typeof value === "number" && Number.isFinite(value)) {
            return `<c r="${ref}"${style}><v>${value}</v></c>`;
          }
          return `<c r="${ref}" t="inlineStr"${style}><is><t>${escapeXml(value)}</t></is></c>`;
        })
        .join("");
      const rowAttrs = rowIndex > 0 ? ` r="${rowIndex + 1}" ht="58" customHeight="1"` : ` r="${rowIndex + 1}"`;
      return `<row${rowAttrs}>${cells}</row>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <cols>
    <col min="1" max="1" width="14" customWidth="1"/>
    <col min="2" max="2" width="12" customWidth="1"/>
    <col min="3" max="3" width="10" customWidth="1"/>
    <col min="4" max="5" width="24" customWidth="1"/>
    <col min="6" max="20" width="14" customWidth="1"/>
    <col min="21" max="21" width="38" customWidth="1"/>
  </cols>
  <sheetData>${sheetRows}</sheetData>
</worksheet>`;
}

function stylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="3">
    <numFmt numFmtId="164" formatCode="#,##0"/>
    <numFmt numFmtId="165" formatCode="¥#,##0"/>
    <numFmt numFmtId="166" formatCode="0.0%"/>
  </numFmts>
  <fonts count="2">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><name val="Calibri"/></font>
  </fonts>
  <fills count="2">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
  </fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="5">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
    <xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
    <xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
}

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(value) {
  return new Uint8Array([value & 0xff, (value >>> 8) & 0xff]);
}

function u32(value) {
  return new Uint8Array([
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  ]);
}

function concatBytes(parts) {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(length);
  let offset = 0;
  parts.forEach((part) => {
    result.set(part, offset);
    offset += part.length;
  });
  return result;
}

function createZip(files) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  files.forEach((file) => {
    const nameBytes = encoder.encode(file.name);
    const data = typeof file.data === "string" ? encoder.encode(file.data) : file.data;
    const crc = crc32(data);
    const localHeader = concatBytes([
      u32(0x04034b50),
      u16(20),
      u16(0x0800),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(nameBytes.length),
      u16(0),
      nameBytes,
    ]);
    localParts.push(localHeader, data);
    centralParts.push(
      concatBytes([
        u32(0x02014b50),
        u16(20),
        u16(20),
        u16(0x0800),
        u16(0),
        u16(0),
        u16(0),
        u32(crc),
        u32(data.length),
        u32(data.length),
        u16(nameBytes.length),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(0),
        u32(offset),
        nameBytes,
      ]),
    );
    offset += localHeader.length + data.length;
  });

  const central = concatBytes(centralParts);
  const end = concatBytes([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(central.length),
    u32(offset),
    u16(0),
  ]);
  return concatBytes([...localParts, central, end]);
}

function exportExcel() {
  const filename = requestedFilename("xlsx");
  if (!filename) return;
  const rows = excelRows();
  const files = [
    {
      name: "[Content_Types].xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`,
    },
    {
      name: "_rels/.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    },
    {
      name: "xl/workbook.xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Profit" sheetId="1" r:id="rId1"/></sheets>
  <calcPr calcMode="auto" fullCalcOnLoad="1" forceFullCalc="1"/>
</workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
    },
    {
      name: "xl/styles.xml",
      data: stylesXml(),
    },
    {
      name: "xl/worksheets/sheet1.xml",
      data: worksheetXml(rows),
    },
  ];
  const blob = new Blob([createZip(files)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  downloadBlob(blob, filename);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function setCaptureMode(enabled) {
  document.body.classList.toggle("capture-mode", enabled);
  captureModeBtn.setAttribute("aria-pressed", String(enabled));
  captureModeBtn.querySelector(".button-main").textContent = enabled
    ? "退出截图"
    : "截图模式";
  captureModeBtn.querySelector(".button-sub").textContent = enabled
    ? "캡처 종료"
    : "캡처 모드";
}

tbody.addEventListener("input", recalculate);
tbody.addEventListener("change", recalculate);
tbody.addEventListener("click", (event) => {
  const row = event.target.closest("tr");
  if (!row) return;
  if (event.target.matches('[data-action="remove"]')) {
    row.remove();
    if (!tbody.querySelector("tr")) addRow({ category: "cosmetics" });
    recalculate();
  }
  if (event.target.closest('[data-action="extract"]')) {
    extractProduct(row);
  }
});
settingInputs.forEach((input) => input.addEventListener("input", recalculate));
addRowBtn.addEventListener("click", () => addRow({ category: "cosmetics" }));
addRowBottomBtn.addEventListener("click", () => addRow({ category: "cosmetics" }));
captureModeBtn.addEventListener("click", () => {
  setCaptureMode(!document.body.classList.contains("capture-mode"));
});
saveRecordBtn.addEventListener("click", saveRecord);
importRecordBtn.addEventListener("click", () => recordFileInput.click());
recordFileInput.addEventListener("change", () => {
  const [file] = recordFileInput.files || [];
  if (file) importRecordFile(file);
});
exportBtn.addEventListener("click", exportCsv);
exportExcelBtn.addEventListener("click", exportExcel);
defaultRows.forEach(addRow);
