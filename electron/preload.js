const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  getDecklists: () => ipcRenderer.invoke("get-decklists"),
  getArtistLists: () => ipcRenderer.invoke("get-artist-lists"),
  runMatch: (opts) => ipcRenderer.invoke("run-match", opts),
  cancelMatch: () => ipcRenderer.invoke("cancel-match"),
  importMoxfield: (url) => ipcRenderer.invoke("import-moxfield", url),
  deleteDeck: (filename) => ipcRenderer.invoke("delete-deck", filename),
  saveDeck: (data) => ipcRenderer.invoke("save-deck", data),
  saveArtistList: (data) => ipcRenderer.invoke("save-artist-list", data),
  deleteArtistList: (filename) => ipcRenderer.invoke("delete-artist-list", filename),
  resetCache: () => ipcRenderer.invoke("reset-cache"),
  openUrls: (urls) => ipcRenderer.invoke("open-urls", urls),
  exportPdfImages: (imageUrls) => ipcRenderer.invoke("export-pdf-images", imageUrls),
  openFile: (path) => ipcRenderer.invoke("open-file", path),
  onProgress: (cb) => ipcRenderer.on("match-progress", (_, data) => cb(data)),
});
