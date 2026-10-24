import { expect, resetPhone, test } from './fixtures.js'

test('first open asks for the notice, then shows the book with its version under the security headers', async ({ page }) => {
  const response = await page.goto('/')
  const headers = response.headers()
  expect(headers['content-security-policy']).toContain("default-src 'self'")
  expect(headers['x-content-type-options']).toBe('nosniff')

  const notice = page.getByRole('dialog', { name: 'Before you write anything down' })
  await expect(notice).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(notice).toBeVisible()
  await notice.getByRole('button', { name: 'I understand' }).click()
  await expect(notice).toBeHidden()

  await expect(page.getByText(/^Version \d+\.\d+\.\d+ · built \d{4}-\d{2}-\d{2}$/)).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Places', exact: true })).toBeVisible()
  await expect(notice).toBeHidden()
})

test('a case opens from today’s board while a search is typed, and Escape brings focus back', async ({ page }) => {
  await resetPhone(page)
  const search = page.getByRole('searchbox', { name: 'Search your book' })
  await search.fill('nothing matches this')
  await expect(page.getByText('Dr. Ada Chen')).toHaveCount(0)

  await page.getByLabel('Time', { exact: true }).fill('07:30')
  await page.getByLabel('Room', { exact: true }).fill('4')
  await page.getByLabel('Surgeon', { exact: true }).fill('Chen')
  await page.getByLabel('Procedure', { exact: true }).fill('Right total knee')
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  const entry = page.getByRole('button', { name: /07:30 · Rm 4 · Chen · Right total knee/ })
  await entry.click()

  const caseView = page.getByRole('dialog', { name: /Dr\. Ada Chen/ })
  await expect(caseView).toBeVisible()
  await expect(caseView.getByText('Knee tray')).toBeVisible()
  await expect(search).toHaveValue('')

  await page.keyboard.press('Escape')
  await expect(caseView).toBeHidden()
  await expect(page.locator('#procedure-p')).toBeVisible()
  await expect(entry).toBeFocused()
})

test('every overlay closes with Escape, keeps Tab inside, and gives focus back', async ({ page }) => {
  await resetPhone(page)
  const overlays = [
    ['Places', page.getByRole('dialog', { name: 'Places' })],
    ['Import', page.locator('[aria-labelledby="import-title"]')],
    ['Add surgeon', page.locator('[aria-labelledby="add-surgeon-title"]')],
  ]
  for (const [button, dialog] of overlays) {
    const opener = page.getByRole('button', { name: button, exact: true })
    await opener.click()
    await expect(dialog).toBeVisible()
    for (let i = 0; i < 25; i += 1) await page.keyboard.press('Tab')
    expect(await dialog.evaluate(node => node.contains(document.activeElement))).toBe(true)
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(opener).toBeFocused()
  }
})

test.describe('small screens', () => {
  test.use({ viewport: { width: 320, height: 640 } })

  test('the home screen fits 320 pixels and its controls are at least 44 pixels', async ({ page }) => {
    await resetPhone(page)
    const width = await page.evaluate(() => document.scrollingElement.scrollWidth)
    expect(width).toBeLessThanOrEqual(320)
    const small = await page.locator('header button, main button, main input, main select').evaluateAll(nodes => nodes
      .filter(node => node.offsetParent !== null)
      .map(node => ({ label: node.getAttribute('aria-label') || node.textContent.trim(), ...node.getBoundingClientRect().toJSON() }))
      .filter(box => box.height < 44 || box.width < 44)
      .map(box => `${box.label} ${Math.round(box.width)}x${Math.round(box.height)}`))
    expect(small).toEqual([])
  })
})
