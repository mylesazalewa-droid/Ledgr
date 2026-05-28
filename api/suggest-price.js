export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });

  const { name, make, model, condition, category } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name is required' });

  const itemDesc = [name, make, model].filter(Boolean).join(' ');
  const prompt = `You are a resale pricing expert. Based on these item details, suggest a fair asking price for selling on platforms like eBay or Facebook Marketplace.

Item: ${itemDesc}
Condition: ${condition || 'Good'}${category ? `\nCategory: ${category}` : ''}

Respond ONLY with a JSON object (no markdown, no extra text):
{"low": 20, "high": 50, "suggested": 35, "reasoning": "One sentence why."}`;

  try {
    const apiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 200 },
        }),
      }
    );

    const data = await apiRes.json();

    if (!apiRes.ok) {
      console.error('Gemini suggest-price error:', apiRes.status, JSON.stringify(data));
      return res.status(502).json({ error: 'Gemini API error', detail: data });
    }

    let text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    // Strip markdown code fences Gemini sometimes wraps around JSON
    text = text.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();

    // Extract the first JSON object in the response
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      console.error('suggest-price: could not find JSON in response:', text);
      return res.status(500).json({ error: 'Could not parse price suggestion', raw: text });
    }

    const suggestion = JSON.parse(match[0]);
    return res.status(200).json(suggestion);
  } catch (err) {
    console.error('suggest-price handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}
