/* global Customizer */
/* global BookmarksDatabase */

'use strict';

var BrowserCustomizer = function() {
  Customizer.call(this, 'browser', 'json');

  this.set = function(aData, passCallback, failCallback) {
    if (!aData) {
      return;
    }

    var self = this;
    aData.browser.bookmarks.forEach(function(bookmark) {
      if (!bookmark.uri || !bookmark.title) {
        return;
      }

      var data = {
        type: 'url',
        name: undefined,
        url: undefined,
        icon: undefined};

      data.name = bookmark.title;
      data.url = bookmark.uri;
      data.icon = bookmark.iconUri;

      BookmarksDatabase.add(data).then(
          function (bookmark) {
            if (passCallback) {
              passCallback(bookmark);
            }},
          function (bookmark) {
            if (failCallback) {
              failCallback(bookmark);
            }
          });
    }, self);
  };
};

var browserCustomizer = new BrowserCustomizer();
browserCustomizer.init();
