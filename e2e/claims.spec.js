import AxeBuilder from '@axe-core/playwright'
import { expect, resetPhone, savedFile, test } from './fixtures.js'

// Checks the claims the app makes in its footer and docs: nothing in the book is uploaded,
// and every screen meets WCAG 2.2 AA as far as an automated scan can tell.

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

async function openCard(page) {
  const header = page.getByRole('button', { name: /^Right total knee/ })
  if ((await header.getAttribute('aria-expanded')) !== 'true') await header.click()
}

async function expectAccessible(page, screen, include) {
  let scan = new AxeBuilder({ page }).withTags(WCAG)
  if (include) scan = scan.include(include)
  const { violations } = await scan.analyze()
  const summary = violations.map(v => `${screen}: ${v.id} (${v.impact}) ${v.help}\n  ${v.nodes.map(n => n.target.join(' ')).slice(0, 5).join('\n  ')}`)
  expect(summary, summary.join('\n')).toEqual([])
}

test('a full session sends nothing anywhere: every request is a GET for the app’s own files', async ({ page, context }, testInfo) => {
  const origin = new URL(testInfo.project.use.baseURL).origin
  const requests = []
  context.on('request', request => requests.push(request))
  await resetPhone(page)

  await openCard(page)
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await page.getByLabel('Position', { exact: true }).fill('Supine, bump under the hip')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await page.getByRole('button', { name: 'I was in this case' }).click()
  await page.getByRole('dialog').getByRole('textbox').fill('Alex')
  await page.getByRole('dialog').getByRole('button', { name: /Confirm/ }).click()

  await page.getByRole('button', { name: 'Case view' }).click()
  await expect(page.getByRole('dialog', { name: /Dr\. Ada Chen/ })).toBeVisible()
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: /^Share/ }).click()
  await expect(page.getByRole('dialog', { name: 'Share procedure' })).toBeVisible()
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: 'Earlier versions of Right total knee' }).click()
  await page.keyboard.press('Escape')

  await savedFile(page, () => page.getByRole('button', { name: 'Export backup' }).click(), testInfo)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Dr. Ada Chen' })).toBeVisible()

  expect(requests.length).toBeGreaterThan(0)
  const outside = requests
    .filter(request => !/^(data|blob):/.test(request.url()))
    .filter(request => new URL(request.url()).origin !== origin || request.method() !== 'GET' || request.postData())
    .map(request => `${request.method()} ${request.url()}`)
  expect(outside, outside.join('\n')).toEqual([])
})

test('the home list, a card, the case view, the editor, and Share pass an automated WCAG 2.2 AA scan', async ({ page }) => {
  await resetPhone(page)
  await expectAccessible(page, 'home')

  await openCard(page)
  await expectAccessible(page, 'open card')

  await page.getByRole('button', { name: 'Case view' }).click()
  await expect(page.getByRole('dialog', { name: /Dr\. Ada Chen/ })).toBeVisible()
  await expectAccessible(page, 'case view', '[role="dialog"]')
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await expect(page.getByRole('dialog').first()).toBeVisible()
  await expectAccessible(page, 'editor', '[role="dialog"]')
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: /^Share/ }).click()
  await expect(page.getByRole('dialog', { name: 'Share procedure' })).toBeVisible()
  await expectAccessible(page, 'share', '[role="dialog"]')
})

test('Earlier versions, Recently deleted, Places, Import, and Add surgeon pass an automated WCAG 2.2 AA scan', async ({ page }) => {
  await resetPhone(page)
  await openCard(page)
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await page.getByLabel('Position', { exact: true }).fill('Supine')
  await page.getByRole('button', { name: 'Save', exact: true }).click()

  await page.getByRole('button', { name: 'Earlier versions of Right total knee' }).click()
  const history = page.getByRole('dialog', { name: 'Earlier versions' })
  await history.getByRole('button', { name: 'View earlier version 1' }).click()
  await expectAccessible(page, 'earlier versions', '[role="dialog"]')
  await page.keyboard.press('Escape')

  for (const [button, name] of [['Places', 'places'], ['Import', 'import'], ['Add surgeon', 'add surgeon']]) {
    await page.getByRole('button', { name: button, exact: true }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expectAccessible(page, name, '[role="dialog"]')
    await page.keyboard.press('Escape')
  }

  await openCard(page)
  await page.getByRole('button', { name: 'Delete case' }).click()
  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await page.getByRole('button', { name: 'Recently deleted cards (1)' }).click()
  await expect(page.getByRole('dialog', { name: 'Recently deleted cards' })).toBeVisible()
  await expectAccessible(page, 'recently deleted', '[role="dialog"]')
})
