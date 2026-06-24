const defaultRows = [
  {
    productUrl: "https://brand.naver.com/shop-pleuvoir/products/11150832330",
    imageUrl:
      "https://shop-phinf.pstatic.net/20260529_248/178003191168544TGL_JPEG/57554588533323005_151313993.jpg?type=o1000",
    category: "cosmetics",
    capacity: 300,
    chineseName: "Pleuvoir 花香麝香洗手液 300mL",
    name: "플르부아 플로럴 머스크 핸드워시 300mL",
    krwRetail: 28000,
    krwSupply: 12900,
    taobaoPrice: 248,
    taobaoLowPrice: 228,
  },
];

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
  productUrl: "官网链接",
  imageUrl: "产品图",
  category: "品类",
  capacity: "容量",
  chineseName: "中文产品名",
  name: "产品名",
  krwRetail: "韩国售价(KRW)",
  cnyRetail: "韩国售价(CNY)",
  krwSupply: "供货价(KRW)",
  cnySupply: "供货价(CNY)",
  supplyRate: "供货率",
  taobaoPrice: "淘宝原价(CNY)",
  taobaoLowPrice: "淘宝最低价(CNY)",
  normalProfit: "原价利润(CNY)",
  discountProfit: "最低价利润(CNY)",
  normalTaxRate: "原价税率",
  normalTax: "原价税金(CNY)",
  discountTaxRate: "最低价税率",
  discountTax: "最低价税金(CNY)",
};

const percentKeys = new Set(["supplyRate", "normalTaxRate", "discountTaxRate"]);
const categoryLabels = {
  cosmetics: "化妆品",
  maskpack: "面膜",
  other: "其他",
};

const tbody = document.querySelector("#productRows");
const template = document.querySelector("#rowTemplate");
const addRowBtn = document.querySelector("#addRowBtn");
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
    ["향", ""],
  ];
  replacements.forEach(([from, to]) => {
    text = text.replaceAll(from, to);
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
    discountProfit,
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
    setOutput(row, "discountProfit", data.discountProfit, money);
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

async function extractProduct(row) {
  const url = row.querySelector('[data-field="productUrl"]').value.trim();
  if (!url) {
    setStatus(row, "请先输入链接", "error");
    return;
  }

  const apiBase = location.protocol === "file:" ? "http://localhost:4177" : "";
  setStatus(row, "提取中", "loading");
  try {
    const response = await fetch(`${apiBase}/api/extract?url=${encodeURIComponent(url)}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "提取失败");

    if (payload.imageUrl) row.querySelector('[data-field="imageUrl"]').value = payload.imageUrl;
    if (payload.name) row.querySelector('[data-field="name"]').value = payload.name;
    if (payload.chineseName) {
      row.querySelector('[data-field="chineseName"]').value = payload.chineseName;
    } else if (payload.name) {
      row.querySelector('[data-field="chineseName"]').value = translateProductName(payload.name);
    }
    if (payload.price) row.querySelector('[data-field="krwRetail"]').value = payload.price;
    if (payload.capacity) row.querySelector('[data-field="capacity"]').value = payload.capacity;

    const found = [
      payload.imageUrl ? "产品图" : "",
      payload.name ? "产品名" : "",
      payload.chineseName || payload.name ? "中文名" : "",
      payload.price ? "韩国售价" : "",
      payload.capacity ? "容量" : "",
    ].filter(Boolean);

    setStatus(
      row,
      found.length ? `已提取 ${found.join(" / ")}` : "未识别到字段",
      found.length ? "ok" : "error",
    );
    recalculate();
  } catch (error) {
    setStatus(row, error.message || "提取失败", "error");
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
        if (percentKeys.has(key)) return percent(value);
        return value;
      }),
    );
  });
  return rows;
}

function formulaCell(formula, value = 0) {
  return { formula, value };
}

function excelRows() {
  const keys = Object.keys(exportHeaders);
  const rows = [[...keys.map((key) => exportHeaders[key])]];
  const config = settings();

  tbody.querySelectorAll("tr").forEach((row, index) => {
    const data = calculate(row);
    const r = index + 2;
    const normalTaxRateFormula = `IF(D${r}="化妆品",IF(M${r}/E${r}<10,9.1%,23.05%),IF(D${r}="面膜",IF(M${r}/E${r}<15,9.1%,23.05%),9.1%))`;
    const discountTaxRateFormula = `IF(D${r}="化妆品",IF(N${r}/E${r}<10,9.1%,23.05%),IF(D${r}="面膜",IF(N${r}/E${r}<15,9.1%,23.05%),9.1%))`;

    rows.push([
      data.productUrl,
      data.imageUrl,
      data.category,
      data.capacity,
      data.chineseName,
      data.name,
      data.krwRetail,
      formulaCell(`G${r}/${config.exchangeRate}`, data.cnyRetail),
      data.krwSupply,
      formulaCell(`I${r}/${config.exchangeRate}`, data.cnySupply),
      formulaCell(`IF(G${r}>0,I${r}/G${r},0)`, data.supplyRate),
      data.taobaoPrice,
      data.taobaoLowPrice,
      formulaCell(`M${r}-J${r}-M${r}*${config.taobaoPlatformRate}-M${r}*${config.sellerRate}-MIN(${config.krLogistics},${config.krLogistics}*M${r}/${config.freeShippingBase})-R${r}`, data.normalProfit),
      formulaCell(`N${r}-J${r}-N${r}*${config.taobaoPlatformRate}-N${r}*${config.sellerRate}-MIN(${config.krLogistics},${config.krLogistics}*N${r}/${config.freeShippingBase})-T${r}`, data.discountProfit),
      formulaCell(normalTaxRateFormula, data.normalTaxRate),
      formulaCell(`M${r}*Q${r}`, data.normalTax),
      formulaCell(discountTaxRateFormula, data.discountTaxRate),
      formulaCell(`N${r}*S${r}`, data.discountTax),
    ]);
  });

  return rows;
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function exportCsv() {
  const lines = exportRows().map((row) => row.map(csvEscape).join(","));
  const blob = new Blob(["\ufeff", lines.join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  downloadBlob(blob, "profit-simulation.csv");
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

function worksheetXml(rows) {
  const sheetRows = rows
    .map((row, rowIndex) => {
      const cells = row
        .map((value, colIndex) => {
          const ref = `${columnName(colIndex)}${rowIndex + 1}`;
          if (value && typeof value === "object" && "formula" in value) {
            const cached = Number.isFinite(value.value) ? value.value : 0;
            return `<c r="${ref}"><f>${escapeXml(value.formula)}</f><v>${cached}</v></c>`;
          }
          if (typeof value === "number" && Number.isFinite(value)) {
            return `<c r="${ref}"><v>${value}</v></c>`;
          }
          return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
        })
        .join("");
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <sheetData>${sheetRows}</sheetData>
</worksheet>`;
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
  const rows = excelRows();
  const files = [
    {
      name: "[Content_Types].xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
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
</workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`,
    },
    {
      name: "xl/worksheets/sheet1.xml",
      data: worksheetXml(rows),
    },
  ];
  const blob = new Blob([createZip(files)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  downloadBlob(blob, "profit-simulation.xlsx");
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
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
  if (event.target.matches('[data-action="extract"]')) {
    extractProduct(row);
  }
});
settingInputs.forEach((input) => input.addEventListener("input", recalculate));
addRowBtn.addEventListener("click", () => addRow({ category: "cosmetics" }));
exportBtn.addEventListener("click", exportCsv);
exportExcelBtn.addEventListener("click", exportExcel);
defaultRows.forEach(addRow);
