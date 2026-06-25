// Get a nested value using a configurable separator
function getValue(obj, path, separator = '.') {
  const keys = path.split(separator);
  let current = obj;
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return undefined;
    current = current[key];
  }
  return current;
}

// Handles * wildcards in the path (e.g., "items.*.name")
function extractWildcard(obj, path, separator) {
  const parts = path.split(separator);
  const starIndex = parts.indexOf('*');
  if (starIndex === -1) {
    // Simple path
    return getValue(obj, path, separator);
  }

  // Build prefix path leading to the array
  const prefix = parts.slice(0, starIndex).join(separator);
  // Suffix path to apply to each element
  const suffix = parts.slice(starIndex + 1).join(separator);

  const array = getValue(obj, prefix, separator);
  if (!Array.isArray(array)) return undefined;

  return array.map(item => getValue(item, suffix, separator));
}

export default async function handler(req, res) {
  // CORS – allow requests from any origin
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
    const { data, paths, separator } = req.body;

    // Validate input
    if (!data || !Array.isArray(paths) || paths.length === 0) {
      return res.status(400).json({
        error: 'Request body must contain "data" (object) and "paths" (array of strings). Optional: "separator"'
      });
    }

    const sep = separator || '.'; // default to dot notation

    const result = {};
    for (const path of paths) {
      // Create a safe display key: replace ".*" with "[*]" for clarity
      const safeKey = path.replace(new RegExp(`\\${sep}\\*`, 'g'), '[*]');
      result[safeKey] = extractWildcard(data, path, sep);
    }

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: 'Extraction failed', details: err.message });
  }
}
