/* global Customizer */
/* global BookmarksDatabase */

'use strict';

var BrowserCustomizer = function() {
  Customizer.call(this, 'browser', 'json');

  this.set = function(aData) {
    if (!aData || ! aData.bookmarks) {
      return;
    }

    var self = this;
    aData.bookmarks.forEach(function(bookmark) {
      if (!bookmark.uri || !bookmark.title) {
        return;
      }

      var data = {
        type: 'url',
        name: bookmark.title,
        url: bookmark.uri,
        icon: bookmark.iconUri
      };
      BookmarksDatabase.add(data);
    }, self);
  };
};

var browserCustomizer = new BrowserCustomizer();
browserCustomizer.init();
