import { expect, resetPhone, test } from './fixtures.js'

async function openCard(page) {
  const header = page.getByRole('button', { name: /^Right total knee/ })
  if ((await header.getAttribute('aria-expanded')) !== 'true') await header.click()
}

test('an edited card keeps its earlier version, which can be read and brought back after a reload', async ({ page }) => {
  await resetPhone(page)
  await openCard(page)
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await page.getByLabel('Position', { exact: true }).fill('Supine, bump under the hip')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.locator('#procedure-p').getByText('Supine, bump under the hip')).toBeVisible()
  const sheet = page.getByRole('dialog', { name: 'Earlier versions' })
  await page.getByRole('button', { name: 'Earlier versions of Right total knee' }).click()
  await expect(sheet.getByText('Changed after it: Position.')).toBeVisible()
  await page.keyboard.press('Escape')

  await page.reload()
  await openCard(page)
  await page.getByRole('button', { name: 'Earlier versions of Right total knee' }).click()
  await expect(sheet.getByText('Changed after it: Position.')).toBeVisible()
  await expect(sheet.getByText(/by an edit on this phone\./)).toBeVisible()

  await sheet.getByRole('button', { name: 'View earlier version 1' }).click()
  await expect(sheet.getByText('Earlier version · not the current card')).toBeVisible()
  await expect(sheet.getByText('Supine, bump under the hip')).toHaveCount(0)
  await expect(sheet.getByText('Knee tray')).toBeVisible()

  await sheet.getByRole('button', { name: 'Bring back earlier version 1' }).click()
  await sheet.getByRole('button', { name: 'Bring this version back' }).click()
  await expect(sheet).toBeHidden()
  await expect(page.getByText(/The earlier version of Right total knee is back/)).toBeVisible()
  await expect(page.locator('#procedure-p').getByText('Supine, bump under the hip')).toHaveCount(0)

  await page.getByRole('button', { name: 'Earlier versions of Right total knee' }).click()
  await expect(sheet.getByText(/by bringing back an earlier version\./)).toBeVisible()
  await expect(sheet.getByRole('listitem')).toHaveCount(2)
})

test('a deleted card stays in Recently deleted after the undo is gone, and comes back with its surgeon', async ({ page }) => {
  await resetPhone(page)
  await page.getByRole('button', { name: 'Delete Dr. Ada Chen' }).click()
  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Dr. Ada Chen' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Recently deleted cards (1)' })).toBeVisible()

  await page.reload()
  await page.getByRole('button', { name: 'Recently deleted cards (1)' }).click()
  const sheet = page.getByRole('dialog', { name: 'Recently deleted cards' })
  await expect(sheet.getByText('Right total knee · Dr. Ada Chen')).toBeVisible()
  await sheet.getByRole('button', { name: 'Bring back Right total knee · Dr. Ada Chen' }).click()
  await expect(sheet).toBeHidden()

  await expect(page.getByRole('heading', { name: 'Dr. Ada Chen' })).toBeVisible()
  await expect(page.getByText('Right total knee is back in your book, unconfirmed.')).toBeVisible()
  await expect(page.getByRole('button', { name: /Recently deleted cards/ })).toHaveCount(0)
})
