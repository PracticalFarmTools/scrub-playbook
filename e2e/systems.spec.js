import { expect, resetPhone, test } from './fixtures.js'

const book = {
  version: 2,
  surgeons: [{
    id: 'a',
    name: 'Dr. Ada Chen',
    specialty: 'Orthopedics',
    facility: 'Main',
    demo: false,
    firstCase: [],
    archived: false,
    preferredSystems: [
      { id: 'ps1', catalogId: 'sys-mako', name: 'Mako', companyId: 'stryker', catalogNumber: '', overrideUrl: '', repExpected: false },
    ],
  }],
  procedures: [{
    id: 'p',
    surgeonId: 'a',
    name: 'Right total knee',
    approach: '',
    demo: false,
    confirmations: [],
    lastConfirmedAt: null,
    updatedAt: new Date().toISOString(),
    official: { label: '', note: '' },
    blocks: {
      trays: [{ id: 't1', commonName: 'Knee tray', spdName: '', vendorName: 'Stryker', openOrHold: 'open', systemId: 'cs1' }],
      systems: [{
        id: 'cs1',
        catalogId: 'sys-attune',
        name: 'ATTUNE Knee System',
        companyId: 'depuy-synthes-j-and-j',
        catalogNumber: '',
        overrideUrl: '',
        repExpected: true,
      }],
    },
  }],
}

test('a case opens its product page, and the surgeon’s other system opens as instructions', async ({ page }) => {
  await resetPhone(page, { book })
  const header = page.getByRole('button', { name: /^Right total knee/ })
  if ((await header.getAttribute('aria-expanded')) !== 'true') await header.click()
  const card = page.locator('#procedure-p')
  await expect(card.getByRole('link', { name: 'Product page' })).toHaveAttribute('href', /attune-knee-system/)
  await expect(card.getByRole('listitem').filter({ hasText: 'Knee tray' })).toContainText('ATTUNE Knee System')

  await page.getByRole('button', { name: 'Case view', exact: true }).click()
  const view = page.getByRole('dialog')
  await expect(view.getByRole('link', { name: 'Product page' })).toBeVisible()
  await expect(view.getByText('This surgeon uses')).toBeVisible()
  await expect(view.getByRole('link', { name: 'Stryker instructions' })).toHaveAttribute('href', 'https://ifu.stryker.com')
  await expect(view.getByText('Knee tray · ATTUNE Knee System · Open')).toBeVisible()
})

test('search finds a system by name and does not list the directory for one letter', async ({ page }) => {
  await resetPhone(page, { book })
  const search = page.getByLabel('Search your book')
  await search.fill('a')
  await expect(page.getByText('Company instructions')).toHaveCount(0)

  await search.fill('centurion')
  await expect(page.getByText('Centurion Vision System')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Alcon instructions' })).toHaveAttribute('href', 'https://ifu.alcon.com')
  await expect(page.getByRole('link', { name: 'Product page' })).toHaveCount(0)
})
