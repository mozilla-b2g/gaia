'use strict';
/* exported FileSystemHelper */

var FileSystemHelper = {
  fsProvider: navigator.fileSystemProvider,

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

  mount(storage) {
    return this.fsProvider.mount({
      fileSystemId: storage.id,
      displayName: storage.name,
      writable: false,
      openedFilesLimit: 10
    });
  },

  handleGetMetadata(event) {
    console.log('handleGetMetadata');
    console.log(event);
  },
  handleOpenFile(event) {
    console.log('handleOpenFile');
    console.log(event);
  },
  handleCloseFile(event) {
    console.log('handleCloseFile');
    console.log(event);
  },
  handleReadDirectory(event) {
    console.log('handleReadDirectory');
    console.log(event);
  },
  handleReadFile(event) {
    console.log('handleReadFile');
    console.log(event);
  }

};
