// api/extract.js
function getValue(obj, path, separator = '.') {
  const keys = path.split(separator);
  let current = obj;
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return undefined;
    current = current[key];
  }
  return current;
}

function extractWildcard(obj, path, separator) {
  const parts = path.split(separator);
  const starIndex = parts.indexOf('*');
  if (starIndex === -1) {
    return getValue(obj, path, separator);
  }
  const prefix = parts.slice(0, starIndex).join(separator);
  const suffix = parts.slice(starIndex + 1).join(separator);
  const array = getValue(obj, prefix, separator);
  if (!Array.isArray(array)) return undefined;
  return array.map(item => getValue(item, suffix, separator));
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests are accepted' });
  }

  try {
    let { data, paths, separator } = req.body;

    // If data is a string, parse it server‑side
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (parseError) {
        return res.status(400).json({ error: 'Invalid JSON string in data field', details: parseError.message });
      }
    }

    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Invalid "data". Must be a parsed JSON object or a valid JSON string.' });
    }
    if (!Array.isArray(paths) || paths.length === 0) {
      return res.status(400).json({ error: 'Request body must contain "data" (object or string) and "paths" (array of strings). Optional: "separator"' });
    }

    const sep = separator || '.';
    const result = {};
    for (const path of paths) {
      const safeKey = path.replace(new RegExp(`\\${sep}\\*`, 'g'), '[*]');
      result[safeKey] = extractWildcard(data, path, sep);
    }

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: 'Extraction failed', details: err.message });
  }
}
