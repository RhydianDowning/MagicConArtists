const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  getDecklists: () => ipcRenderer.invoke("get-decklists"),
  getArtistLists: () => ipcRenderer.invoke("get-artist-lists"),
  runMatch: (opts) => ipcRenderer.invoke("run-match", opts),
  importMoxfield: (url) => ipcRenderer.invoke("import-moxfield", url),
  deleteDeck: (filename) => ipcRenderer.invoke("delete-deck", filename),
  onProgress: (cb) => ipcRenderer.on("match-progress", (_, data) => cb(data)),
});
