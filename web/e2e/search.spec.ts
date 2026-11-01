import { en, expect, openMap, test } from './fixtures';

test.describe('search', () => {
    test('selects a municipality with the keyboard', async ({ page, index }) => {
        const lisboa = index.municipalities.find((m) => m.name === 'Lisboa')!;
        await openMap(page);

        const input = page.getByRole('combobox', { name: en['search.label'] });
        await input.fill('lisb');
        await expect(
            page.getByRole('listbox').getByRole('option', { name: 'Lisboa' })
        ).toBeVisible();
        await input.press('Enter');

        const panel = page.getByRole('complementary');
        await expect(panel.getByRole('heading', { level: 2, name: 'Lisboa' })).toBeVisible();
        await expect(page).toHaveURL(new RegExp(`[?&]c=${lisboa.dico}`));
        await expect(input).toHaveValue('');
        await expect(page.getByRole('listbox')).toBeHidden();
    });

    test('ignores accents and case, and selects on click', async ({ page }) => {
        await openMap(page);
        await page.getByRole('combobox', { name: en['search.label'] }).fill('EVORA');
        await page.getByRole('listbox').getByRole('option', { name: 'Évora' }).click();
        await expect(
            page.getByRole('complementary').getByRole('heading', { level: 2, name: 'Évora' })
        ).toBeVisible();
    });

    test('arrow keys move the active option and Escape clears', async ({ page }) => {
        await openMap(page);
        const input = page.getByRole('combobox', { name: en['search.label'] });
        await input.fill('vila');
        const options = page.getByRole('listbox').getByRole('option');
        await expect(options.first()).toHaveAttribute('aria-selected', 'true');
        await input.press('ArrowDown');
        await expect(options.nth(1)).toHaveAttribute('aria-selected', 'true');
        await expect(options.first()).toHaveAttribute('aria-selected', 'false');

        await input.press('Escape');
        await expect(input).toHaveValue('');
        await expect(page.getByRole('listbox')).toBeHidden();
    });
});
