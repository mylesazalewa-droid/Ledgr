/**
 * Vercel serverless function — POST /api/generate-listing
 * Generates a listing description using Google Gemini (free tier).
 *
 * FREE: 1,500 requests/day — no credit card required.
 *
 * Setup (one time):
 *   1. https://aistudio.google.com/ → "Get API key" → Create API key
 *   2. Vercel → Project → Settings → Environment Variables
 *      Name: GEMINI_API_KEY   Value: <your key>   Environments: All
 *   3. Redeploy (or push any commit)
 *
 * Body:    { name, make, model, condition, notes, askingPrice }
 * Returns: { description: string }
 */

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY is not configured',
      setup: 'Add GEMINI_API_KEY to Vercel → Project → Settings → Environment Variables, then redeploy.',
    });
  }

  const { name, make, model, condition, notes, askingPrice } = req.body ?? {};
  if (!name) return res.status(400).json({ error: 'name is required' });

  const title = [name, make, model].filter(Boolean).join(' ');

  const prompt = [
    `Write a short, honest marketplace listing description (2–3 sentences) for this resale item:`,
    ``,
    `Item: ${title}`,
    condition   ? `Condition: ${condition}`  : null,
    askingPrice ? `Price: $${askingPrice}`   : null,
    notes       ? `Seller notes: ${notes}`   : null,
    ``,
    `Rules: factual and friendly, do NOT invent specs not mentioned, no emojis,`,
    `no first-person, end with a brief call to action. Plain text only.`,
  ].filter(v => v !== null).join('\n');

  try {
    const apiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 200, temperature: 0.65 },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ],
      }),
    });

    if (!apiRes.ok) {
      const detail = await apiRes.json().catch(() => ({}));
      console.error('Gemini error:', apiRes.status, detail);
      return res.status(502).json({ error: 'Gemini API error', status: apiRes.status });
    }

    const data        = await apiRes.json();
    const description = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;

    if (!description) {
      console.error('Empty Gemini response:', JSON.stringify(data));
      return res.status(500).json({ error: 'No description returned — try again' });
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ description });

  } catch (err) {
    console.error('generate-listing error:', err);
    return res.status(500).json({ error: 'Internal error — try again', message: err.message });
  }
}
