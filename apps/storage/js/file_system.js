'use strict';
/* exported FileSystemHelper */

var FileSystemHelper = {
  fsProvider: navigator.fileSystemProvider,
  registeredStorage: {},

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

  addManager(storageId, udManager) {
    // openedFileList will be clear if addManagrer is invoked.
    this.registeredStorage[storageId] = {
      openedFileList: {},
      udManager: udManager
    };
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

  unmount(storageId) {
    this.fsProvider.unmount({
      fileSystemId: storageId
    });
  },

  handleGetMetadata(event) {
    console.log('handleGetMetadata:', event.options.entryPath);
    console.log(event);
    var udm = this.registeredStorage[event.options.fileSystemId].udManager;
    if (!udm) {
      event.errorCallback('AccessDenied');
      return;
    }
    udm.getFileMeta(event.options.entryPath, (error, res) => {
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
    var opt = event.options,
        filePath = opt.filePath,
        fileSystemId = opt.fileSystemId,
        requestId = opt.requestId;
    this.registeredStorage[fileSystemId].openedFileList[requestId] = filePath;
    event.successCallback();
  },
  handleCloseFile(event) {
    console.log('handleCloseFile');
    console.log(event);
    var opt = event.options,
        fileSystemId = opt.fileSystemId,
        requestId = opt.requestId;
    delete this.registeredStorage[fileSystemId].openedFileList[requestId];
    event.successCallback();
  },
  handleReadDirectory(event) {
    console.log('handleReadDirectory:', event.options.directoryPath);
    console.log(event);
    var udm = this.registeredStorage[event.options.fileSystemId].udManager;
    if (!udm) {
      event.errorCallback('AccessDenied');
      return;
    }
    udm.getFileList(event.options.directoryPath, (error, res) => {
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
    var opt = event.options,
        fileSystemId = opt.fileSystemId,
        openRequestId = opt.openRequestId,
        filePath = this.registeredStorage[fileSystemId].
          openedFileList[openRequestId],
        udm = this.registeredStorage[opt.fileSystemId].udManager;
    if (!udm) {
      event.errorCallback('AccessDenied');
      return;
    }
    var ab = new Uint8Array(opt.length);
    udm.downloadFileInRangeByCache(filePath,
                                         ab, opt.offset, opt.length, () => {
      event.successCallback(ab.buffer, false);
    });
  }

};
