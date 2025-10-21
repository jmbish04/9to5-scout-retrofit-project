/**
 * Discovery Workflow
 */

// ... (imports and other methods)

export class DiscoveryWorkflow {
  // ... (constructor, execute, etc.)

  /**
   * Extract URLs from page content
   */
  private async extractUrlsFromPage(
    content: string,
    customSelectors?: Record<string, string>
  ): Promise<string[]> {
    const urls = new Set<string>();
    const rewriter = new HTMLRewriter().on('a', {
      element(element) {
        const href = element.getAttribute('href');
        if (href) {
          urls.add(href);
        }
      },
    });

    try {
      await rewriter.transform(new Response(content)).text();
    } catch (error) {
      console.error("Failed to parse HTML for URL extraction:", error);
    }
    
    return Array.from(urls);
  }

  // ... (rest of the class)
}