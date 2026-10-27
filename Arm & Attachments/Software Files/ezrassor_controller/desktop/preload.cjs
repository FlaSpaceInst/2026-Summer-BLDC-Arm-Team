'use strict';
const { contextBridge, ipcRenderer } = require('electron');

// Do not expose ipcRenderer, Node, filesystem, or shell APIs to React.
contextBridge.exposeInMainWorld('reRassorDesktop', Object.freeze({
  request: (details) => ipcRenderer.invoke('rover:request', details)
}));
