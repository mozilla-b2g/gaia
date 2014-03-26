'use strict';

/* exported MockBookmarkEditor */
var MockBookmarkEditor = {
  init: function mbe_init(options) {
    this.onsaved = options.onsaved;
    this.oncancelled = options.oncancelled;
  },

  close: function mbe_close() {
    this.oncancelled();
  },

  save: function mbe_save(value) {
    this.onsaved(value);
  },

  cancel: function mbe_cancel() {
    this.oncancelled();
  }

};
