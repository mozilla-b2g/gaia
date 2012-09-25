
'use strict';

var Bookmark = function Bookmark(params) {
  this.origin = params.url;

  this.removable = true;

  this.manifest = {
    name: params.name,
    icons: {
      60: params.icon
    },
    default_locale: 'en-US'
  };
};

Bookmark.prototype = {
  launch: function bookmark_launch() {
    new MozActivity({
      name: 'view',
      data: {
        type: 'url',
        url: this.origin
      }
    });
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
