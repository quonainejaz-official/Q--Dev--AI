/**
 * Web Search Service (4.2) — searches the web for current information.
 *
 * Supports:
 * - Brave Search API (default) — https://api.search.brave.com/res/v1/web/search
 * - Easily extensible to Google Custom Search, SerpAPI, Bing, etc.
 *
 * Usage:
 *   const { searchWeb } = require("./searchService");
 *   const results = await searchWeb("latest React features", { count: 5 });
 */

const BRAVE_API_URL = "https://api.search.brave.com/res/v1/web/search";

/**
 * Search the web using Brave Search API.
 *
 * @param {string} query - Search query
 * @param {Object} options
 * @param {number} options.count - Number of results (default 5, max 10)
 * @param {string} options.country - Country code (default "US")
 * @param {string} options.searchLang - Language (default "en")
 * @returns {Promise<Array<{title: string, url: string, snippet: string}>>}
 */
const searchWeb = async (query, options = {}) => {
  const {
    count: rawCount = 5,
    country = "US",
    searchLang = "en"
  } = options;

  const count = Math.min(Math.max(rawCount, 1), 10);

  const apiKey = process.env.BRAVE_API_KEY;
  if (!apiKey) {
    throw new Error("BRAVE_API_KEY is not configured. Set it in environment to enable web search.");
  }

  const params = new URLSearchParams({
    q: query,
    count: count.toString(),
    country,
    searchLang
  });

  const response = await fetch(`${BRAVE_API_URL}?${params}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": apiKey
    }
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Brave Search API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const results = (data.web?.results || []).slice(0, count);

  return results.map((r) => ({
    title: r.title || "",
    url: r.url || "",
    snippet: r.description || ""
  }));
};

/**
 * Format search results into a readable string for injection into prompts.
 *
 * @param {Array} results - Array of {title, url, snippet}
 * @returns {string}
 */
const formatResults = (results) => {
  if (!results || !results.length) return "No search results found.";

  return results
    .map((r, i) => `${i + 1}. **${r.title}**\n   ${r.url}\n   ${r.snippet}`)
    .join("\n\n");
};

module.exports = { searchWeb, formatResults };
