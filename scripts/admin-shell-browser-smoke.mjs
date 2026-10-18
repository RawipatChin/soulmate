import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright';

// Expose the real iframe integration only inside this test server.
const server = await createServer({
  server: { host: '127.0.0.1', port: 3197, strictPort: true },
  plugins: [{ name: 'admin-shell-test', enforce: 'pre', transform(code, id) {
    if (id.endsWith('/src/components/ScreenRenderer.tsx')) return `${code}\nexport { flushSync } from 'react-dom'; export { React, createRoot, mountAdminNotificationBell, installDashboardAdminShell, normalizeAdminShellSizing, mountAdminSidebarNav, installAdminSurfaceStyles };`;
  } }],
});
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  // External assets are blocked; these checks exercise the injected shell CSS.
  await page.addInitScript(() => { window.tailwind = {}; });
  await page.route('https://**', route => route.abort());
  await page.goto('http://127.0.0.1:3197/stitch_soulmate_e_commerce/soulmate_super_admin_settings/code.html');
  const result = await page.evaluate(async () => {
    const shell = await import('/src/components/ScreenRenderer.tsx');
    const { React, createRoot, flushSync } = shell;
    await shell.installDashboardAdminShell(document, '/admin/settings');
    shell.normalizeAdminShellSizing(document);
    shell.mountAdminSidebarNav(document, '/admin/settings', false);
    const adminRoleLinkCount = document.querySelectorAll('#soulmate-admin-sidebar nav a').length;
    shell.mountAdminSidebarNav(document, '/admin/settings', true);
    shell.installAdminSurfaceStyles(document, '/admin/settings');
    const warnings = [];
    const originalError = console.error;
    console.error = (...args) => { warnings.push(args.map(String).join(' ')); originalError(...args); };
    const host = document.createElement('div');
    document.body.append(host);
    const parent = createRoot(host);
    function Screen() {
      React.useEffect(() => shell.mountAdminNotificationBell(document, () => {}), []);
      return null;
    }
    flushSync(() => parent.render(React.createElement(Screen)));
    await new Promise(resolve => setTimeout(resolve, 50));
    // Route changes remove ScreenRenderer while React is committing the parent.
    flushSync(() => parent.render(null));
    await new Promise(resolve => setTimeout(resolve, 50));
    parent.unmount();
    console.error = originalError;
    return {
      warnings: warnings.filter(message => message.includes('synchronously unmount a root')),
      sidebarPadding: getComputedStyle(document.querySelector('#soulmate-admin-sidebar')).paddingLeft,
      settingsCurrent: document.querySelector('#soulmate-admin-sidebar a[aria-current="page"]')?.getAttribute('href'),
      linkCount: document.querySelectorAll('#soulmate-admin-sidebar nav a').length,
      adminRoleLinkCount,
      roleManagementLink: document.querySelector('#soulmate-admin-sidebar a[href="/admin/admins"]')?.textContent?.trim(),
      notificationHosts: document.querySelectorAll('.admin-notification-host').length,
    };
  });
  console.log(JSON.stringify(result, null, 2));
  assert.deepEqual(result.warnings, [], 'Switching to a native page must not synchronously unmount an embedded React root');
  assert.equal(result.sidebarPadding, '0px', 'Settings save-bar styles must not alter the shared sidebar');
  assert.equal(result.settingsCurrent, '/admin/settings');
  assert.equal(result.adminRoleLinkCount, 8, 'Admin navigation must hide role management');
  assert.equal(result.linkCount, 9, 'Super Admin navigation must include role management');
  assert.equal(result.roleManagementLink, 'ผู้ดูแลและสิทธิ์');
  assert.equal(result.notificationHosts, 0);
  assert.deepEqual(pageErrors, [], 'The harness must not pass after a component crashes');
  for (const width of [390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    const padding = await page.locator('#soulmate-admin-sidebar').evaluate(element => getComputedStyle(element).paddingLeft);
    assert.equal(padding, '0px', `Settings save-bar styles must not alter the sidebar at ${width}px`);
  }
  console.log('Admin shell browser regression passed');
} finally {
  await browser?.close();
  await server.close();
}
