// Device presets: CSS viewport dimensions + user agent. The dimensions match
// the metrics Chrome DevTools uses for its device modes.
const IOS_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 " +
  "(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const IPAD_UA =
  "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 " +
  "(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36";

const DEVICES = [
  {
    id: "iphone-14-pro",
    name: "iPhone 14 Pro",
    os: "ios",
    width: 393,
    height: 852,
    ua: IOS_UA,
  },
  {
    id: "iphone-15-pro-max",
    name: "iPhone 15 Pro Max",
    os: "ios",
    width: 430,
    height: 932,
    ua: IOS_UA,
  },
  {
    id: "iphone-se",
    name: "iPhone SE",
    os: "ios",
    width: 375,
    height: 667,
    ua: IOS_UA,
  },
  {
    id: "pixel-7",
    name: "Pixel 7",
    os: "android",
    width: 412,
    height: 915,
    ua: ANDROID_UA,
  },
  {
    id: "galaxy-s20-ultra",
    name: "Galaxy S20 Ultra",
    os: "android",
    width: 412,
    height: 915,
    ua: ANDROID_UA.replace("Pixel 7", "SM-G988B"),
  },
  {
    id: "ipad-mini",
    name: "iPad Mini",
    os: "ios",
    width: 768,
    height: 1024,
    ua: IPAD_UA,
  },
];

// Make available both to the service worker (importScripts) and popup (window).
if (typeof self !== "undefined") self.DEVICES = DEVICES;
