import fs from 'node:fs'
import { expect, importFile, resetPhone, savedFile, test } from './fixtures.js'

async function openCard(page) {
  const header = page.getByRole('button', { name: /^Right total knee/ })
  if ((await header.getAttribute('aria-expanded')) !== 'true') await header.click()
}

async function editAs(page, position, name) {
  await openCard(page)
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await page.getByLabel('Position', { exact: true }).fill(position)
  await page.getByLabel('Your name').fill(name)
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.locator('#procedure-p').getByText(`Last change signed by ${name}`, { exact: false })).toBeVisible()
}

async function restoreOnNewPhone(browser, testInfo, data, name) {
  const path = testInfo.outputPath(name)
  fs.writeFileSync(path, JSON.stringify(data))
  const phone = await (await browser.newContext({ ...testInfo.project.use, serviceWorkers: 'block' })).newPage()
  await resetPhone(phone, { book: null, techName: 'Sam' })
  const dialog = await importFile(phone, path)
  await dialog.getByRole('button', { name: 'Restore my backup' }).click()
  await expect(dialog).toBeHidden()
  await openCard(phone)
  return phone
}

test('a saved change is signed under the name typed, and still reads as signed after a reload', async ({ page }) => {
  await resetPhone(page)
  await openCard(page)
  const card = page.locator('#procedure-p')
  await expect(card.getByText('No signed changes yet. The next saved change is signed.')).toBeVisible()

  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await page.getByLabel('Position', { exact: true }).fill('Supine, bump under the hip')
  const name = page.getByLabel('Your name')
  await expect(name).toHaveValue('Alex')
  await name.fill('')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveText('Type your name to save. It is signed with this change.')
  await expect(name).toBeFocused()
  await name.fill('Jordan Ames')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(card.getByText(/^Last change signed by Jordan Ames · .+ · this phone$/)).toBeVisible()

  await page.reload()
  await openCard(page)
  await expect(card.getByText(/^Last change signed by Jordan Ames · .+ · this phone$/)).toBeVisible()
  await page.getByRole('button', { name: 'History of Right total knee' }).click()
  const sheet = page.getByRole('dialog', { name: 'Card history' })
  const signed = sheet.getByRole('list', { name: 'Signed changes, newest first' })
  await expect(signed.getByRole('listitem')).toHaveCount(1)
  await expect(signed.getByRole('listitem').first()).toContainText('Edited the card · Jordan Ames')
  await expect(signed.getByRole('listitem').first()).toContainText('this phone')
  await expect(sheet.getByText(/^This phone signs as [0-9A-F]{4}(-[0-9A-F]{4}){3}\./)).toBeVisible()
})

test('on another phone, a signed card reads as signed by that phone, a changed card as changed, and an altered record as not checking out', async ({ browser, page }, testInfo) => {
  await resetPhone(page)
  await editAs(page, 'Supine, bump under the hip', 'Jordan Ames')
  await page.getByRole('button', { name: 'History of Right total knee' }).click()
  const fingerprint = (await page.getByText(/^This phone signs as /).textContent()).match(/[0-9A-F]{4}(-[0-9A-F]{4}){3}/)[0]
  await page.keyboard.press('Escape')
  const backup = await savedFile(page, () => page.getByRole('button', { name: 'Export backup' }).click(), testInfo, 'backup.json')
  const trail = backup.data.book.procedures.find(p => p.id === 'p').trail
  expect(trail).toHaveLength(1)
  expect(trail[0]).toMatchObject({ by: 'Jordan Ames', action: 'edited' })

  const same = await restoreOnNewPhone(browser, testInfo, backup.data, 'same.json')
  await expect(same.locator('#procedure-p').getByText(`Last change signed by Jordan Ames`, { exact: false })).toContainText(`phone ${fingerprint}`)

  const altered = structuredClone(backup.data)
  altered.book.procedures.find(p => p.id === 'p').blocks.position.text = 'Prone'
  const changed = await restoreOnNewPhone(browser, testInfo, altered, 'altered.json')
  await expect(changed.locator('#procedure-p').getByText(/^Changed after the last signed change \(Jordan Ames, .+\)\. Who changed it since is not known\.$/)).toBeVisible()

  const forged = structuredClone(backup.data)
  forged.book.procedures.find(p => p.id === 'p').trail[0].by = 'Dr. Ada Chen'
  const broken = await restoreOnNewPhone(browser, testInfo, forged, 'forged.json')
  await expect(broken.locator('#procedure-p').getByText(/^A signed record on this card does not check out/)).toBeVisible()
})
