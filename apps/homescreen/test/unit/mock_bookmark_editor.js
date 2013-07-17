'use strict';

var MockBookmarkEditor = {
  init: function mbe_init(options) {
    this.onsaved = options.onsaved;
    this.oncancelled = options.oncancelled;
  },

  close: function mbe_close() {
    this.oncancelled();
  },

  save: function mbe_save() {
    this.onsaved();
  },

  cancel: function mbe_cancel() {
    this.oncancelled();
  }

};
