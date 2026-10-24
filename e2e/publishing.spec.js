import { expect, importFile, openPlaces, published, resetPhone, savedFile, test } from './fixtures.js'

const PASSPHRASE = 'blue heron 42'

async function publish(page, testInfo, name) {
  const sheet = await openPlaces(page)
  const file = await savedFile(page, () => sheet.getByRole('button', { name: 'Publish as unit book' }).click(), testInfo, name)
  await expect(sheet.getByRole('status')).toContainText(`revision ${file.data.revision}`)
  await page.keyboard.press('Escape')
  await expect(sheet).toBeHidden()
  return file
}

async function lockedBackup(page, testInfo) {
  await page.getByRole('button', { name: 'Export backup' }).click()
  const prompt = page.locator('[aria-labelledby="backup-key-title"]')
  await expect(prompt).toContainText('This phone publishes the unit book for Main')
  await prompt.getByLabel(/Passphrase, at least/).fill(PASSPHRASE)
  await prompt.getByLabel('The same passphrase again').fill(PASSPHRASE)
  return savedFile(page, () => prompt.getByRole('button', { name: 'Lock the key and save the backup' }).click(), testInfo, 'backup.json')
}

test('two open tabs continue one unit book under one key', async ({ context, page }, testInfo) => {
  await resetPhone(page)
  const second = await context.newPage()
  await second.goto('/')
  await expect(second.getByRole('button', { name: 'Places', exact: true })).toBeVisible()

  const first = await publish(page, testInfo, 'first.json')
  const next = await publish(second, testInfo, 'second.json')
  expect(first.data.revision).toBe(1)
  expect(next.data.revision).toBe(2)
  expect(next.data.unitBookId).toBe(first.data.unitBookId)
  expect(next.data.publicKey).toEqual(first.data.publicKey)
  expect(next.filename).toBe('scrubplaybook-unit-main-r2.json')

  await expect.poll(async () => (await published(page)).Main?.revision).toBe(2)
  await expect(page.getByText('Unit book published').first()).toBeVisible()
  await expect(page.getByText('Unit book published')).toHaveCount(2)
})

test('a locked backup moves publishing to a new phone only with the passphrase', async ({ browser, page }, testInfo) => {
  await resetPhone(page)
  const unit = await publish(page, testInfo, 'unit.json')
  const backup = await lockedBackup(page, testInfo)
  const text = JSON.stringify(backup.data)
  expect(text).not.toContain('privateKey')
  expect(backup.data.appVersion).toMatch(/^\d+\.\d+\.\d+/)
  expect(backup.data.extras.published.Main.lockedKey).toMatchObject({ kdf: 'PBKDF2-SHA256', cipher: 'AES-GCM' })

  const phone = await (await browser.newContext({ ...testInfo.project.use, serviceWorkers: 'block' })).newPage()
  await resetPhone(phone, { book: null, techName: 'Sam' })
  const dialog = await importFile(phone, backup.path)
  await expect(dialog).toContainText('holds the locked publishing key for Main')
  await dialog.locator('input[type="password"]').fill('blue heron 41')
  await dialog.getByRole('button', { name: 'Restore my backup' }).click()
  await expect(dialog.getByRole('alert')).toBeVisible()
  expect(await published(phone)).toEqual({})

  await dialog.locator('input[type="password"]').fill(PASSPHRASE)
  await dialog.getByRole('button', { name: 'Restore my backup' }).click()
  await expect(dialog).toBeHidden()
  await expect(phone.getByText(/This phone publishes Main again\. Only one phone should publish each place/)).toBeVisible()

  const next = await publish(phone, testInfo, 'next.json')
  expect(next.data.revision).toBe(2)
  expect(next.data.unitBookId).toBe(unit.data.unitBookId)
  expect(next.data.publicKey).toEqual(unit.data.publicKey)
})

test('after a key replacement, staff switch once and the old unit book is refused', async ({ browser, page }, testInfo) => {
  await resetPhone(page)
  const old = await publish(page, testInfo, 'old.json')

  const staff = await (await browser.newContext({ ...testInfo.project.use, serviceWorkers: 'block' })).newPage()
  await resetPhone(staff, { book: null, techName: 'Sam' })
  let dialog = await importFile(staff, old.path)
  await expect(dialog).toContainText(/Check that the key [0-9A-F-]+ matches the one your unit posted/)
  await dialog.getByRole('button', { name: 'Add unit book' }).click()
  await expect(dialog).toBeHidden()
  await expect(staff.getByText('Dr. Ada Chen')).toBeVisible()

  const sheet = await openPlaces(page)
  await sheet.locator('summary', { hasText: 'Unit rules' }).click()
  await sheet.getByRole('button', { name: 'Replace the publishing key' }).click()
  await sheet.getByRole('button', { name: 'Replace the key', exact: true }).click()
  await expect(sheet.getByRole('status')).toContainText('The key for Main is replaced')
  const fresh = await savedFile(page, () => sheet.getByRole('button', { name: 'Publish as unit book' }).click(), testInfo, 'new.json')
  expect(fresh.data.unitBookId).not.toBe(old.data.unitBookId)
  expect(fresh.data.revision).toBe(1)

  dialog = await importFile(staff, fresh.path)
  await expect(dialog).toContainText('from an earlier unit book')
  await expect(dialog.getByRole('button', { name: 'Add unit book' })).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Switch to this unit book for Dr. Ada Chen' }).click()
  await expect(dialog).toBeHidden()
  await expect(staff.getByText(/switched to the new unit book/)).toBeVisible()

  dialog = await importFile(staff, old.path)
  await expect(dialog.getByRole('alert')).toBeVisible()
  await expect(dialog.getByRole('button', { name: /Add unit book|Switch to this unit book/ })).toHaveCount(0)
})

test('a phone that cannot save its publishing record sends nothing, then continues the same unit book', async ({ page }, testInfo) => {
  await resetPhone(page)
  const first = await publish(page, testInfo, 'first.json')

  await page.evaluate(() => {
    const setItem = Storage.prototype.setItem
    window.__restoreSetItem = () => { Storage.prototype.setItem = setItem }
    Storage.prototype.setItem = function (key, value) {
      if (key === 'scrubplaybook_published') throw new DOMException('full', 'QuotaExceededError')
      return setItem.call(this, key, value)
    }
  })
  let downloads = 0
  page.on('download', () => { downloads += 1 })
  const sheet = await openPlaces(page)
  await sheet.getByRole('button', { name: 'Publish as unit book' }).click()
  await expect(sheet.getByRole('status')).toHaveText('Main was not published. This phone could not save its publishing record. Free some space, or leave private browsing, and try again.')
  expect(downloads).toBe(0)
  expect((await published(page)).Main.revision).toBe(1)

  await page.evaluate(() => window.__restoreSetItem())
  await page.keyboard.press('Escape')
  const next = await publish(page, testInfo, 'next.json')
  expect(next.data.revision).toBe(2)
  expect(next.data.publicKey).toEqual(first.data.publicKey)
})
