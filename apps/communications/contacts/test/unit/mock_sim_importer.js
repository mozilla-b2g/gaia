'use strict';

var MockSimContactsImporter = function(n) {
  this.number = n || 0;
};

MockSimContactsImporter.prototype = {
  set onread(cb) {
    this.readCb = cb;
  },
  set onimported(cb) {
    this.importedCb = cb;
  },
  set onfinish(cb) {
    this.finishCb = cb;
  },
  start: function() {
    this.readCb(this.number);
    if (this.number === 0) {
      this.finishCb(this.numDuplicated);
      return;
    }
    for(var j = 0; j < this.numImportedContacts; j++) {
      this.importedCb();
    }
    this.finishCb(this.numDuplicated);
  }
};
