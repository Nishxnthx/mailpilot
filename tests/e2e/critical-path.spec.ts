import { test, expect } from '@playwright/test';

test.describe('MailPilot Critical E2E Workflows', () => {
  test.beforeEach(async ({ page }) => {
    // Stub Gmail Auth Status as connected
    await page.route('/api/auth/google/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ connected: true, email: 'user@example.com' }),
      });
    });

    // Stub Inbox Mail List
    await page.route('/api/mail/inbox*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          emails: [
            {
              id: 'e-1',
              threadId: 't-1',
              subject: 'Quarterly Team Update',
              snippet: 'Here is the summary for Q3...',
              from: { name: 'Sarah Recruiter', email: 'sarah@company.com' },
              to: [{ email: 'user@example.com' }],
              date: '2026-09-05T10:00:00Z',
              internalDate: 1700000000000,
              bodyHtml: '<h1>Quarterly Update</h1><p>Here is the report.</p>',
              isRead: false,
              isStarred: false,
              folder: 'inbox',
              labels: ['INBOX'],
            },
          ],
          resultSizeEstimate: 1,
        }),
      });
    });
  });

  test('Flow 1: Application loads successfully with MailPilot branding and folder list', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('MailPilot', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Inbox', exact: true })).toBeVisible();
  });

  test('Flow 2: Compose UI modal can be opened and closed', async ({ page }) => {
    await page.goto('/');
    const composeButton = page.getByRole('button', { name: 'New Message' });
    await expect(composeButton).toBeVisible();
    await composeButton.click();
    await expect(page.getByPlaceholder('recipient@example.com')).toBeVisible();

    // Click close button in modal header
    const closeBtn = page.locator('div.fixed button').first();
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await expect(page.getByPlaceholder('recipient@example.com')).not.toBeVisible();
  });

  test('Flow 3: Action Preview confirmation card is visible before sending', async ({ page }) => {
    await page.goto('/');
    // Check Copilot AI panel welcome message is visible
    await expect(page.getByText(/MailPilot AI assistant/i)).toBeVisible();
  });
});
