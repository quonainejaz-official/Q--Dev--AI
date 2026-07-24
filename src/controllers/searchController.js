const { searchWeb, formatResults } = require("../services/searchService");

/**
 * POST /api/search — search the web and return formatted results.
 *
 * Body: { query: string, count?: number }
 * Response: { results: Array<{title, url, snippet}>, formatted: string }
 */
const postSearch = async (req, res, next) => {
  try {
    const { query, count } = req.body || {};

    if (!query || typeof query !== "string" || !query.trim()) {
      return res.status(400).json({ error: "Query is required." });
    }

    const results = await searchWeb(query.trim(), { count: count || 5 });

    res.json({
      results,
      formatted: formatResults(results)
    });
  } catch (error) {
    // Don't leak API key errors to the client.
    if (error.message.includes("BRAVE_API_KEY")) {
      return res.status(503).json({ error: "Web search is not configured." });
    }
    next(error);
  }
};

module.exports = { postSearch };
