export interface SearchResult {
  title: string;
  snippet: string;
  url: string;
  source?: string;
}

export class WebSearchService {
  /**
   * Performs real web search using DuckDuckGo Instant Answer / HTML API
   */
  public static async search(query: string, limit: number = 5): Promise<SearchResult[]> {
    if (!query || !query.trim()) return [];

    try {
      const encoded = encodeURIComponent(query.trim());
      // Primary: DuckDuckGo instant answer JSON
      const res = await fetch(`https://api.duckduckgo.com/?q=${encoded}&format=json&no_html=1&skip_disambig=1`, {
        headers: { 'User-Agent': 'GAAI-WebSearch/1.0' }
      });

      if (!res.ok) {
        throw new Error(`DuckDuckGo returned ${res.status}`);
      }

      const data: any = await res.json();
      const results: SearchResult[] = [];

      if (data.AbstractText && data.AbstractURL) {
        results.push({
          title: data.Heading || query,
          snippet: data.AbstractText,
          url: data.AbstractURL,
          source: data.AbstractSource || 'DuckDuckGo Abstract'
        });
      }

      if (Array.isArray(data.RelatedTopics)) {
        for (const topic of data.RelatedTopics) {
          if (results.length >= limit) break;
          if (topic.Text && topic.FirstURL) {
            results.push({
              title: topic.Text.split(' - ')[0] || query,
              snippet: topic.Text,
              url: topic.FirstURL,
              source: 'Web Topic'
            });
          }
        }
      }

      // If instant answer was empty, perform duckduckgo lite HTML search
      if (results.length === 0) {
        const htmlRes = await fetch(`https://html.duckduckgo.com/html/?q=${encoded}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        if (htmlRes.ok) {
          const html = await htmlRes.text();
          // Extract results with regex
          const regex = /<a class="result__url" href="([^"]+)">[\s\S]*?<a class="result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/g;
          let match;
          while ((match = regex.exec(html)) !== null && results.length < limit) {
            const rawUrl = match[1]?.trim();
            const rawSnippet = match[2]?.replace(/<[^>]+>/g, '').trim();
            if (rawUrl && rawSnippet) {
              results.push({
                title: query,
                snippet: rawSnippet,
                url: rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`,
                source: 'DuckDuckGo Web'
              });
            }
          }
        }
      }

      return results;
    } catch (err: any) {
      console.warn('[WebSearch] DuckDuckGo search error:', err.message);
      return [];
    }
  }
}
