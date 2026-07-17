// Mobile Switch background service worker.
//
// Opens the current page in a dedicated, phone-sized popup window. Because the
// window's viewport is genuinely narrow, CSS media queries fire for real (true
// mobile breakpoints), and we rewrite the User-Agent + Client-Hint headers so
// servers deliver their mobile HTML. No chrome.debugger => no "debugging this
// browser" bar and no dead space around the page.

importScripts("devices.js");

const UA_RULE_ID = 1001;
const RESOURCE_TYPES = [
  "main_frame",
  "sub_frame",
  "xmlhttprequest",
  "script",
  "stylesheet",
  "image",
  "font",
  "media",
  "websocket",
  "other",
];

// ---- persisted state (storage.session survives SW suspension) ----

async function getPhone() {
  const { phone } = await chrome.storage.session.get("phone");
  return phone || null; // { windowId, tabId, deviceId }
}
async function setPhone(phone) {
  await chrome.storage.session.set({ phone });
}
async function clearPhone() {
  await chrome.storage.session.remove("phone");
}

async function setBadge(on) {
  try {
    await chrome.action.setBadgeText({ text: on ? "ON" : "" });
    await chrome.action.setBadgeBackgroundColor({ color: "#5b7cff" });
    if (chrome.action.setBadgeTextColor) {
      await chrome.action.setBadgeTextColor({ color: "#ffffff" });
    }
  } catch (_) {}
}

// ---- user-agent / client-hint header rewriting (scoped to the phone tab) ----

function chPlatform(os) {
  return os === "android" ? "Android" : "iOS";
}

async function applyUaRule(tabId, device) {
  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [UA_RULE_ID],
    addRules: [
      {
        id: UA_RULE_ID,
        priority: 1,
        condition: { tabIds: [tabId], resourceTypes: RESOURCE_TYPES },
        action: {
          type: "modifyHeaders",
          requestHeaders: [
            { header: "user-agent", operation: "set", value: device.ua },
            { header: "sec-ch-ua-mobile", operation: "set", value: "?1" },
            {
              header: "sec-ch-ua-platform",
              operation: "set",
              value: `"${chPlatform(device.os)}"`,
            },
          ],
        },
      },
    ],
  });
}

async function removeUaRule() {
  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [UA_RULE_ID],
  });
}

// ---- window sizing ----

function waitTabComplete(tabId, timeout = 8000) {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    };
    const listener = (id, info) => {
      if (id === tabId && info.status === "complete") finish();
    };
    chrome.tabs.onUpdated.addListener(listener);
    chrome.tabs.get(tabId, (t) => {
      if (!chrome.runtime.lastError && t && t.status === "complete") finish();
    });
    setTimeout(finish, timeout);
  });
}

// Measure the window chrome (title/URL bar + borders) and resize so the
// *inner* viewport is exactly device.width × device.height.
async function fitViewport(windowId, tabId, device) {
  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => ({
        dw: window.outerWidth - window.innerWidth,
        dh: window.outerHeight - window.innerHeight,
      }),
    });
    const delta = res && res.result ? res.result : { dw: 0, dh: 0 };
    await chrome.windows.update(windowId, {
      width: Math.round(device.width + delta.dw),
      height: Math.round(device.height + delta.dh),
    });
  } catch (_) {
    // Scripting can fail on some pages; the approximate size still works.
  }
}

// ---- core actions ----

async function openOrSwitch(url, device) {
  const existing = await getPhone();

  if (existing) {
    // Reuse the open phone window: apply new UA, resize, reload the URL.
    await applyUaRule(existing.tabId, device);
    await chrome.windows.update(existing.windowId, {
      width: device.width + 16,
      height: device.height + 90,
      focused: true,
    });
    await chrome.tabs.update(existing.tabId, { url });
    await setPhone({ ...existing, deviceId: device.id });
    await waitTabComplete(existing.tabId);
    await fitViewport(existing.windowId, existing.tabId, device);
    await setBadge(true);
    return device.id;
  }

  // Create a fresh popup window, install the UA rule BEFORE navigating so the
  // very first document request already carries the mobile user-agent.
  const win = await chrome.windows.create({
    url: "about:blank",
    type: "popup",
    width: device.width + 16,
    height: device.height + 90,
    focused: true,
  });
  const tab = win.tabs && win.tabs[0];
  if (!tab) throw new Error("Could not create phone window");

  await applyUaRule(tab.id, device);
  await chrome.tabs.update(tab.id, { url });
  await setPhone({ windowId: win.id, tabId: tab.id, deviceId: device.id });
  await waitTabComplete(tab.id);
  await fitViewport(win.id, tab.id, device);
  await setBadge(true);
  return device.id;
}

async function closePhone() {
  const phone = await getPhone();
  await removeUaRule();
  await clearPhone();
  await setBadge(false);
  if (phone) {
    try {
      await chrome.windows.remove(phone.windowId);
    } catch (_) {}
  }
}

// ---- message router ----

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    try {
      if (msg.type === "getState") {
        const phone = await getPhone();
        sendResponse({ ok: true, deviceId: phone ? phone.deviceId : null });
        return;
      }
      if (msg.type === "enable") {
        const device = self.DEVICES.find((d) => d.id === msg.deviceId);
        if (!device) throw new Error("Unknown device: " + msg.deviceId);
        const id = await openOrSwitch(msg.url, device);
        sendResponse({ ok: true, deviceId: id });
        return;
      }
      if (msg.type === "disable") {
        await closePhone();
        sendResponse({ ok: true, deviceId: null });
        return;
      }
      sendResponse({ ok: false, error: "Unknown message type" });
    } catch (e) {
      sendResponse({ ok: false, error: String(e && e.message ? e.message : e) });
    }
  })();
  return true;
});

// If the user closes the phone window manually, tidy up.
chrome.windows.onRemoved.addListener(async (windowId) => {
  const phone = await getPhone();
  if (phone && phone.windowId === windowId) {
    await removeUaRule();
    await clearPhone();
    await setBadge(false);
  }
});
