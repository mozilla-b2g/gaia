
'use strict';

var Bookmark = function Bookmark(params) {
  this.origin = params.url;

  this.removable = true;

  this.manifest = {
    name: params.name,
    icons: {
      60: params.icon
    },
    default_locale: 'en-US',
    wrapperMode: 'new'
  };
};

Bookmark.prototype = {
  launch: function bookmark_launch() {
    window.open(this.origin, JSON.stringify(this.manifest), 'wrapper');
  },

  uninstall: function bookmark_uninstall() {
    var self = this;
    HomeState.deleteBookmark(this.origin,
      function() {
        if (DockManager.contains(self)) {
          DockManager.uninstall(self);
        } else {
          GridManager.uninstall(self);
        }
        Applications.deleteBookmark(self);
      },
      function(er) {
        console.error('Error deleting bookmark ' + er);
      }
    );
  }
};
