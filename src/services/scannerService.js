import sharp from 'sharp';

export const processReceipt = async (fileBuffer) => {
  const optimizedImageBuffer = await sharp(fileBuffer)
    .resize({ width: 1200, withoutEnlargement: true })
    .grayscale()
    .normalize()
    .sharpen()
    .jpeg({ quality: 85 })
    .toBuffer();

  const fileBlob = new Blob([optimizedImageBuffer], { type: 'image/jpeg' });
const formData = new FormData();
  formData.append('apikey', process.env.OCR_SPACE_API_KEY);
  formData.append('language', 'ukr'); 
  formData.append('OCREngine', '3'); 
  formData.append('isOverlayRequired', 'false');
  formData.append('file', fileBlob, 'receipt.jpg');

  const response = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  if (data.IsErroredOnProcessing) {
    throw new Error(data.ErrorMessage[0]);
  }

  const parsedText = data.ParsedResults[0]?.ParsedText || '';

  // 1. Спочатку дістаємо дату
  const dateRegex = /\b(\d{2}[\.\-\/]\d{2}[\.\-\/]\d{4})\b/;
  const dateMatch = parsedText.match(dateRegex);
  
  // 2. Очищаємо текст від дат і часу, щоб вони не стали сумою
  const cleanText = parsedText
    .replace(/\b\d{2}[\.\-\/]\d{2}[\.\-\/]\d{4}\b/g, '') 
    .replace(/\b\d{2}[:\-]\d{2}[:\-]\d{2}\b/g, '');      
  
  let totalAmount = 0;

  // ПРІОРИТЕТ 1: Шукаємо корінь "СПЛАТ", щоб зловити "СПЛАТИ", "ДОСПЛАТИ", "ОПЛАТА" тощо
  const priority1Regex = /(?:СПЛАТ|РАЗОМ|ЗАГАЛОМ|УСЬОГО)[^\d]*?(\d+[.,]\d{2})/i;
  const priority1Match = cleanText.match(priority1Regex);
  
  if (priority1Match) {
    totalAmount = parseFloat(priority1Match[1].replace(',', '.'));
  } else {
    // ПРІОРИТЕТ 2 (ФОЛБЕК): Беремо максимальне число, але ВИРІЗАЄМО всі небезпечні слова
    // "СУММА" з двома М — це готівка клієнта, її теж вирізаємо!
    const safeText = cleanText
      .replace(/(?:СУММА|РЕШТА|ЗДАЧА|ГОТІВКА|КАРТКА|ПДВ)[^\d]*?\d+[.,]\d{2}/gi, '');

    const priceRegex = /\b\d+[.,]\d{2}\b/g;
    const prices = safeText.match(priceRegex);
    if (prices) {
      const numericPrices = prices.map(p => parseFloat(p.replace(',', '.')));
      totalAmount = Math.max(...numericPrices);
    }
  }

  return { 
    date: dateMatch ? dateMatch[1] : null, 
    totalAmount 
  };
};