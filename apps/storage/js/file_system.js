'use strict';
/* global udManager */
/* exported FileSystemHelper */

var FileSystemHelper = {
  fsProvider: navigator.fileSystemProvider,
  openedFileList: {},

  init() {
    this.fsProvider.addEventListener('getmetadatarequested',
      this.handleGetMetadata.bind(this));
    this.fsProvider.addEventListener('openfilerequested',
      this.handleOpenFile.bind(this));
    this.fsProvider.addEventListener('closefilerequested',
      this.handleCloseFile.bind(this));
    this.fsProvider.addEventListener('readdirectoryrequested',
      this.handleReadDirectory.bind(this));
    this.fsProvider.addEventListener('readfilerequested',
      this.handleReadFile.bind(this));
  },

  udToFsMeta(udMeta) {
    return {
      isDirectory: udMeta.isdir === 1,
      name: udMeta.path.split('/').pop(),
      size: udMeta.size,
      modificationTime: udMeta.mtime,
      mimeType: ''
    };
  },

  mount(storage) {
    return this.fsProvider.mount({
      fileSystemId: storage.id,
      displayName: storage.name,
      writable: false,
      openedFilesLimit: 10
    });
  },

  handleGetMetadata(event) {
    console.log('handleGetMetadata:', event.options.entryPath);
    console.log(event);
    udManager.getFileMeta(event.options.entryPath, (error, res) => {
      if (res.data) {
        var meta = res.data.list[0];
        event.successCallback(this.udToFsMeta(meta));
      } else {
        event.errorCallback('NotFound');
      }
    });
  },
  handleOpenFile(event) {
    console.log('handleOpenFile:', event.options.filePath);
    console.log(event);
    this.openedFileList[event.options.requestId] = event.options.filePath;
    event.successCallback();
  },
  handleCloseFile(event) {
    console.log('handleCloseFile');
    console.log(event);
    delete this.openedFileList[event.options.requestId];
    event.successCallback();
  },
  handleReadDirectory(event) {
    console.log('handleReadDirectory:', event.options.directoryPath);
    console.log(event);
    udManager.getFileList(event.options.directoryPath, (error, res) => {
      if (res.data) {
        var metas = res.data.list.map(this.udToFsMeta);
        event.successCallback(metas, false);
      } else {
        event.errorCallback('NotFound');
      }
    });
  },
  handleReadFile(event) {
    console.log('handleReadFile:', event.options.path);
    console.log(event);
    var opt = event.options;
    var requestId = event.options.openRequestId;
    var ab = new Uint8Array(opt.length);
    udManager.downloadFileInRangeByCache(this.openedFileList[requestId],
                                         ab, opt.offset, opt.length, () => {
      event.successCallback(ab.buffer, false);
    });
  }

};
