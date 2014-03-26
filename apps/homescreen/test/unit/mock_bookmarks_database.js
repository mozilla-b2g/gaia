'use strict';

/* exported MockBookmarksDatabase */
var MockBookmarksDatabase = {

  _revisionId: null,

  _bookmarks: {},

  getRevisionId: function mbd_getRevisionId() {
    var revisionId = this._revisionId;

    return {
      then: function(resolve) {
        resolve(revisionId);
      }
    };
  },

  add: function mbd_add(bookmark) {
    this._bookmarks[bookmark.id] = bookmark;

    return {
      then: function(resolve) {
        resolve();
      }
    };
  },

  getAll: function mbd_getAll() {
    var bookmarks = this._bookmarks;

    return {
      then: function(resolve) {
        resolve(bookmarks);
      }
    };
  }
};
