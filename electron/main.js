const { app, BrowserWindow, Menu, shell } = require("electron");
const path = require("path");

const isDev = !app.isPackaged;
const appName = "Factory1";
const defaultProductionUrl = "https://factory1-frontend.vercel.app/login";
const devUrl = "http://localhost:3000/login";

function appUrl() {
  const configuredUrl = process.env.FACTORY1_DESKTOP_URL;

  if (configuredUrl) {
    return ensureLoginPath(configuredUrl);
  }

  return isDev ? devUrl : defaultProductionUrl;
}

function ensureLoginPath(url) {
  try {
    const parsed = new URL(url);

    if (parsed.pathname === "/" || parsed.pathname === "") {
      parsed.pathname = "/login";
    }

    return parsed.toString();
  } catch {
    return defaultProductionUrl;
  }
}

function sameOrigin(left, right) {
  try {
    return new URL(left).origin === new URL(right).origin;
  } catch {
    return false;
  }
}

function createWindow() {
  const startUrl = appUrl();
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 680,
    title: appName,
    backgroundColor: "#f8fafc",
    show: false,
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      devTools: isDev,
    },
  });

  window.once("ready-to-show", () => {
    window.show();
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("mailto:") || !sameOrigin(startUrl, url)) {
      shell.openExternal(url);
      return { action: "deny" };
    }

    window.loadURL(url);
    return { action: "deny" };
  });

  window.webContents.on("will-navigate", (event, url) => {
    if (!sameOrigin(startUrl, url)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  window.loadURL(startUrl);
}

function createMenu() {
  const template = [
    ...(process.platform === "darwin"
      ? [
          {
            label: appName,
            submenu: [
              { role: "about" },
              { type: "separator" },
              { role: "services" },
              { type: "separator" },
              { role: "hide" },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit" },
            ],
          },
        ]
      : []),
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "close" },
        ...(process.platform === "darwin"
          ? [{ type: "separator" }, { role: "front" }]
          : []),
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  app.setName(appName);
  createMenu();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
