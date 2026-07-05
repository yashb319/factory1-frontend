const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("factory1Desktop", {
  platform: process.platform,
  isDesktop: true,
});
