import { expect, test } from './fixtures';

/** What a search engine gets before running any script: the HTML the Worker answers with. */
test.describe('search engines', () => {
    test('a municipality page comes with its own title, links and latest values', async ({
        request,
    }) => {
        const response = await request.get('./concelhos/lisboa');
        expect(response.status()).toBe(200);
        const html = await response.text();
        expect(html).toContain('<html lang="pt-PT">');
        expect(html).toContain(
            '<title>Lisboa: temperatura, chuva e evapotranspiração · IPMA+</title>'
        );
        expect(html).toMatch(/<link rel="canonical" href="http:\/\/[^"]+\/concelhos\/lisboa" \/>/);
        expect(html).toMatch(/hreflang="en" href="[^"]+\/concelhos\/lisboa\?lang=en"/);
        expect(html).toContain('<meta property="og:title"');
        expect(html).toContain('<h1>Lisboa</h1>');
        expect(html).toMatch(/Temperatura máxima<\/a><\/th><td>-?\d+(,\d)? °C<\/td>/);
    });

    test('?lang=en is the English page', async ({ request }) => {
        const html = await (await request.get('./variaveis/tmin?lang=en')).text();
        expect(html).toContain('<html lang="en">');
        expect(html).toContain('<title>Minimum temperature by municipality · IPMA+</title>');
        expect(html).toContain('<h1>Minimum temperature</h1>');
    });

    test('the municipalities list links to every municipality', async ({ request, index }) => {
        const html = await (await request.get('./concelhos')).text();
        const links = html.match(/<a href="\/concelhos\/[a-z0-9-]+">/g) ?? [];
        expect(links).toHaveLength(index.municipalities.length);
    });

    test('unknown addresses are 404 and not indexed', async ({ request }) => {
        for (const path of ['./concelhos/nenhum', './variaveis/nada', './nao-existe']) {
            const response = await request.get(path);
            expect(response.status(), path).toBe(404);
            expect(await response.text()).toContain('<meta name="robots" content="noindex" />');
        }
    });

    test('sitemap.xml lists every page in both languages, and robots.txt points to it', async ({
        request,
        index,
    }) => {
        const sitemap = await (await request.get('./sitemap.xml')).text();
        const pages = 6 + index.metrics.length + index.municipalities.length;
        expect(sitemap.match(/<url>/g)).toHaveLength(pages * 2);
        expect(sitemap).toContain('/concelhos/vila-real-de-santo-antonio</loc>');

        const robots = await (await request.get('./robots.txt')).text();
        expect(robots).toMatch(/^Sitemap: http:\/\/\S+\/sitemap\.xml$/m);
    });

    test('the tab title follows the page shown', async ({ page }) => {
        await page.goto('./concelhos/lisboa?lang=en');
        await expect(page).toHaveTitle('Lisboa: temperature, rain and evapotranspiration · IPMA+');
        await page.goto('./variaveis?lang=en');
        await expect(page).toHaveTitle('Variables · IPMA+');
    });
});
