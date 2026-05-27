/**
 * Vercel serverless function — POST /api/generate-listing
 * Generates a polished listing description using Claude.
 *
 * Body: { name, make, model, condition, notes, askingPrice, costPrice, category }
 * Returns: { description: string }
 *
 * Requires ANTHROPIC_API_KEY in Vercel environment variables.
 */

export default async function handler(req, res) {
  // CORS — allow same-origin only
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  const { name, make, model, condition, notes, askingPrice, costPrice, category } = req.body || {};

  if (!name) {
    return res.status(400).json({ error: 'Item name is required' });
  }

  // Build a compact item summary for the prompt
  const parts = [
    `Item: ${name}`,
    make  ? `Brand: ${make}`  : null,
    model ? `Model: ${model}` : null,
    condition ? `Condition: ${condition}` : null,
    category  ? `Category: ${category}`  : null,
    askingPrice ? `Asking price: $${askingPrice}` : null,
    costPrice   ? `Cost paid: $${costPrice}`       : null,
    notes ? `Seller notes: ${notes}` : null,
  ].filter(Boolean).join('\n');

  const prompt = `You are helping someone sell an item online. Write a compelling, honest listing description for the following item.

${parts}

Guidelines:
- 2–4 short paragraphs, plain text (no markdown, no bullet points, no headers)
- Lead with the most sellable feature or best quality
- Mention condition honestly — buyers appreciate transparency
- Include practical details (what's included, any flaws worth noting, pick-up or shipping)
- Keep a friendly, human tone — not salesy
- End with a light call to action ("Feel free to message with any questions!")
- Maximum 120 words total

Return ONLY the listing text — no preamble, no labels.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic API error:', err);
      return res.status(502).json({ error: 'AI service error — try again' });
    }

    const data = await response.json();
    const description = data.content?.[0]?.text?.trim() || '';

    return res.status(200).json({ description });
  } catch (err) {
    console.error('generate-listing error:', err);
    return res.status(500).json({ error: 'Internal error — try again' });
  }
}
