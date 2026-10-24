import fs from 'node:fs'
import { test as base, expect } from '@playwright/test'

export const now = new Date().toISOString()

export const seedBook = {
  version: 2,
  surgeons: [{ id: 'a', name: 'Dr. Ada Chen', specialty: 'Orthopedics', facility: 'Main', demo: false, firstCase: [], archived: false }],
  procedures: [{
    id: 'p', surgeonId: 'a', name: 'Right total knee', approach: '', demo: false, confirmations: [], lastConfirmedAt: null,
    updatedAt: now, official: { label: '', note: '' },
    blocks: { trays: [{ id: 't1', commonName: 'Knee tray', spdName: '', vendorName: '', openOrHold: 'open' }] },
  }],
}

/**
 * Sets up a phone in a fresh browser context before the app first runs: the first-open notice
 * is answered and `book` (or nothing) is saved. Seeding after the app opened its database races
 * with the app's own first save.
 */
export async function resetPhone(page, { book = seedBook, techName = 'Alex' } = {}) {
  await page.addInitScript(({ book, techName }) => {
    if (sessionStorage.getItem('e2e-seeded')) return
    sessionStorage.setItem('e2e-seeded', '1')
    localStorage.setItem('scrubplaybook_disclaimer_seen', 'true')
    localStorage.setItem('scrubplaybook_tech_name', techName)
    localStorage.setItem('scrubplaybook_last_export', new Date().toISOString())
    if (book) localStorage.setItem('scrubplaybook_book', JSON.stringify(book))
  }, { book, techName })
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Places', exact: true })).toBeVisible()
  if (book) await expect(page.getByRole('heading', { name: book.surgeons[0].name })).toBeVisible()
}

export const published = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('scrubplaybook_published') || '{}'))

/** Runs `action` and returns the JSON file the app saved, with the path it was saved to. */
export async function savedFile(page, action, testInfo, name) {
  const [download] = await Promise.all([page.waitForEvent('download'), action()])
  const path = testInfo.outputPath(name || download.suggestedFilename())
  await download.saveAs(path)
  return { path, filename: download.suggestedFilename(), data: JSON.parse(fs.readFileSync(path, 'utf8')) }
}

export async function openPlaces(page) {
  await page.getByRole('button', { name: 'Places', exact: true }).click()
  const sheet = page.getByRole('dialog', { name: 'Places' })
  await expect(sheet).toBeVisible()
  return sheet
}

export async function importFile(page, path) {
  await page.getByRole('button', { name: 'Import', exact: true }).click()
  const dialog = page.locator('[aria-labelledby="import-title"]')
  await dialog.locator('input[type="file"]').setInputFiles(path)
  return dialog
}

/**
 * Every test fails on a script error or a console error, which is how Chromium reports
 * a Content Security Policy violation.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    const problems = []
    page.on('pageerror', error => problems.push(`page error: ${error.message}`))
    page.on('console', message => {
      if (message.type() === 'error') problems.push(`console error: ${message.text()}`)
    })
    await use(page)
    expect(problems, problems.join('\n')).toEqual([])
  },
})

export { expect }
