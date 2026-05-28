const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

async function callGemini(prompt, apiKey) {
  const res = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents:         [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 512 },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini API error ${res.status}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  // Strip markdown code fences Gemini sometimes wraps around JSON
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
}

/**
 * Given a make + model, ask Gemini to return:
 *   name          – clean product title
 *   est_value     – fair market value (USD number)
 *   asking_price  – recommended listing price (USD number)
 *   description   – 2-3 sentence buyer-facing listing description
 */
export async function lookupItemWithAI(make, model, apiKey) {
  const item = [make, model].filter(Boolean).join(' ');

  const prompt = `You are a resale marketplace expert. A seller is listing:

"${item}"

Return ONLY valid JSON — no explanation, no markdown:
{
  "name": "clean product title (brand + full model name)",
  "est_value": <current fair market value as a plain number, USD>,
  "asking_price": <recommended listing price as a plain number, USD — typically 10-20% above market to leave room to negotiate>,
  "description": "2-3 sentence listing description. Highlight key features, what's typically included in the box, and why it's worth buying. Keep it punchy and buyer-focused — like a real eBay/Facebook Marketplace listing."
}`;

  const json = await callGemini(prompt, apiKey);
  const result = JSON.parse(json);
  return {
    name:         typeof result.name         === 'string' ? result.name : '',
    est_value:    Number(result.est_value)    || 0,
    asking_price: Number(result.asking_price) || 0,
    description:  typeof result.description  === 'string' ? result.description : '',
  };
}

/**
 * Given a UPC/barcode string, ask Gemini to identify the product.
 * Used as a fallback when the UPC database lookup returns nothing.
 */
export async function lookupUPCWithAI(upc, apiKey) {
  const prompt = `Identify the consumer product with this UPC/barcode: ${upc}

Return ONLY valid JSON — no explanation, no markdown:
{
  "name": "full product name",
  "make": "brand or manufacturer",
  "model": "model number or name"
}

If you cannot identify this barcode with confidence, return: {"name":"","make":"","model":""}`;

  const json = await callGemini(prompt, apiKey);
  const result = JSON.parse(json);
  if (!result.name && !result.make && !result.model) return null;
  return {
    name:  typeof result.name  === 'string' ? result.name  : '',
    make:  typeof result.make  === 'string' ? result.make  : '',
    model: typeof result.model === 'string' ? result.model : '',
  };
}
