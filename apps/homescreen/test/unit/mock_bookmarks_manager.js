'use strict';

/* exported MockBookmarksManager */
var MockBookmarksManager = {

  _revisionId : null,

  getHomescreenRevisionId: function mbm_getHomescreenRevisionId(cb) {
    if (this._revisionId !== null) {
      cb(this._revisionId);
    }
  },

  updateHomescreenRevisionId: function mbm_updateHomescreenRevisionId() {

  },

  attachListeners: function mbm_attachListeners() {

  }
};
