// Popup controller. Renders device presets, reflects the active tab's state,
// and talks to the background service worker to toggle emulation.

// An aspect-correct device silhouette drawn from the preset's own dimensions,
// so a phone reads as a phone and the iPad reads as a tablet.
function deviceGlyph(d) {
  const H = 15;
  const ratio = d.width / d.height;
  const W = Math.max(9, Math.round(H * ratio));
  const rx = ratio > 0.6 ? 1.6 : 2.4;
  const cx = (W / 2).toFixed(2);
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none" aria-hidden="true">
      <rect x="0.7" y="0.7" width="${(W - 1.4).toFixed(2)}" height="${(
        H - 1.4
      ).toFixed(2)}" rx="${rx}" stroke="currentColor" stroke-width="1.1"/>
      <line x1="${(W / 2 - 1.3).toFixed(2)}" y1="2.5" x2="${(W / 2 + 1.3).toFixed(
        2,
      )}" y2="2.5" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.6"/>
      <line x1="${cx}" y1="${(H - 2.2).toFixed(
        2,
      )}" x2="${cx}" y2="${(H - 2.2).toFixed(2)}" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" opacity="0.6"/>
    </svg>`;
}

const CHECK =
  '<svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><path d="M2.5 6.8L5 9.3L10.5 3.8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

let currentTab = null;
let activeDeviceId = null;

const els = {
  list: document.getElementById("deviceList"),
  statusDot: document.getElementById("statusDot"),
  statusText: document.getElementById("statusText"),
  hint: document.getElementById("hint"),
};

function send(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (res) => {
      if (chrome.runtime.lastError) {
        resolve({ ok: false, error: chrome.runtime.lastError.message });
      } else {
        resolve(res);
      }
    });
  });
}

function setHint(text, isError) {
  els.hint.textContent = text || "";
  els.hint.classList.toggle("error", !!isError);
}

function render() {
  els.list.innerHTML = "";
  for (const d of self.DEVICES) {
    const li = document.createElement("li");
    li.className = "device" + (d.id === activeDeviceId ? " selected" : "");
    li.dataset.id = d.id;
    li.innerHTML = `
      <span class="glyph">${deviceGlyph(d)}</span>
      <span class="device-name">${d.name}</span>
      <span class="device-spec">${d.width} × ${d.height}</span>
      <span class="check">${CHECK}</span>`;
    li.addEventListener("click", () => onPick(d.id));
    els.list.appendChild(li);
  }

  const active = !!activeDeviceId;
  els.statusDot.classList.toggle("active", active);
  const dev = self.DEVICES.find((d) => d.id === activeDeviceId);
  els.statusText.textContent = dev ? dev.name : "Desktop";
}

async function onPick(deviceId) {
  if (!currentTab) return;

  // Clicking the active device again closes the phone window.
  if (deviceId === activeDeviceId) {
    setHint("Closing…");
    const res = await send({ type: "disable" });
    if (res && res.ok) {
      activeDeviceId = null;
      render();
      setHint("");
    } else {
      setHint(res && res.error ? res.error : "Failed to close.", true);
    }
    return;
  }

  setHint("Opening…");
  const res = await send({ type: "enable", url: currentTab.url, deviceId });
  if (res && res.ok) {
    activeDeviceId = res.deviceId;
    render();
    setHint("Click the device again to close the phone window.");
  } else {
    setHint(res && res.error ? res.error : "Failed to open.", true);
  }
}

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  if (!tab || !/^https?:|^file:/.test(tab.url || "")) {
    els.list.innerHTML =
      '<li class="hint error" style="padding:12px">Open a normal web page (http/https) to use Mobile Switch. Chrome system pages can’t be emulated.</li>';
    return;
  }

  const state = await send({ type: "getState" });
  activeDeviceId = state && state.ok ? state.deviceId : null;
  render();
}

init();
