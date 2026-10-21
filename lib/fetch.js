const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetches a URL as text, with a per-attempt timeout and exponential backoff.
 * 4xx responses (other than 429) are not retried: they will not get better.
 */
export async function fetchText(url, { retries = 3, timeoutMs = 20000, backoffMs = 2000 } = {}) {
    let lastError;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
            if (response.ok) return await response.text();

            lastError = new Error(`HTTP ${response.status} for ${url}`);
            if (response.status < 500 && response.status !== 429) break;
        } catch (error) {
            lastError = new Error(`${error.name}: ${error.message} for ${url}`);
        }

        if (attempt < retries) await sleep(backoffMs * 2 ** attempt);
    }

    throw lastError;
}

/**
 * Maps over `items` with at most `limit` calls in flight. Never rejects: each result is
 * `{ item, value }` or `{ item, error }`, in input order.
 */
export async function mapLimit(items, limit, fn) {
    const results = new Array(items.length);
    let next = 0;

    async function worker() {
        while (next < items.length) {
            const index = next++;
            try {
                results[index] = { item: items[index], value: await fn(items[index]) };
            } catch (error) {
                results[index] = { item: items[index], error };
            }
        }
    }

    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
    return results;
}
