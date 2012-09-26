
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
    var features = {
      name: this.manifest.name,
      icon: this.manifest.icons['60']
    }

    return window.open(this.origin, '_blank', JSON.stringify(features));
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
