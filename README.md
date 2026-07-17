# Mobile Switch

A browser extension that opens any website in a real phone-sized window in one
click. The page gets real mobile breakpoints and the mobile version of the
site, with no DevTools panel and no "debugging this browser" bar.

Pick a device from the toolbar popup (iPhone 14 Pro, iPhone 15 Pro Max,
iPhone SE, Pixel 7, Galaxy S20 Ultra, iPad Mini) and the current page opens in
a window sized to that device's exact viewport.

Works in any Chromium-based browser: Chrome, Brave, Opera, Edge, Vivaldi.

## Install

1. Download the code: click the green **Code** button above, then **Download
   ZIP**, and unzip it somewhere permanent. The browser loads the extension
   from that folder, so don't delete or move it afterwards. You can also clone
   the repo.
2. Open your browser's extensions page:
   - Chrome: `chrome://extensions`
   - Brave: `brave://extensions`
   - Opera: `opera://extensions`
   - Edge: `edge://extensions`
3. Enable **Developer mode**. The toggle is in the top-right corner (in Edge
   it's in the left sidebar).
4. Click **Load unpacked** and select the unzipped folder, the one that
   contains `manifest.json`.
5. Pin the **Mobile Switch** icon to your toolbar, open any site, click the
   icon, and pick a device.

To exit, click the active device again in the popup, or just close the phone
window.

## How it works

- Real breakpoints: the popup window's viewport is genuinely narrow, so the
  page's CSS `@media` queries fire for real instead of a faked resize.
- Mobile HTML: it rewrites the `User-Agent` and `Sec-CH-UA-*` client-hint
  headers (via `declarativeNetRequest`, scoped to just that window's tab) so
  servers deliver their mobile layout.
- Exact fit: after the page loads it measures the window chrome and resizes so
  the inner viewport matches the device exactly, e.g. 393x852.

Unlike DevTools device mode, no debugger is attached, so there is no
"started debugging this browser" warning bar. The trade-off: device pixel
ratio and synthetic touch events aren't emulated, but neither affects the
responsive layout the site serves.

## Notes

- Works on normal `http(s)` and `file` pages. Browser system pages
  (`chrome://...`, the Web Store) can't be opened this way. That's a browser
  restriction.
- Add more devices by appending one entry to `devices.js` (name, viewport
  width/height, user agent) and reloading the extension.
- Firefox isn't supported. It uses a different extension API for this.

## Files

- `manifest.json` - MV3 manifest
- `background.js` - service worker; opens/sizes the phone window and rewrites headers
- `devices.js` - device presets (dimensions + user agent), shared by both scripts
- `popup.html` / `popup.css` / `popup.js` - the toolbar UI
- `icons/` - toolbar icons
