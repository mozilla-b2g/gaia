'use strict';

var Bookmark = function Bookmark(params) {
  this.removable = true;

  if ('iconable' in params) {
    this.iconable = params.iconable;
  } else {
    this.iconable = true;
  }

  this.isBookmark = true;
  this.url = this.bookmarkURL = this.origin = params.bookmarkURL;

  this.manifest = {
    name: params.name,
    icons: {
      60: params.icon
    },
    default_locale: 'en-US'
  };

  this.useAsyncPanZoom = 'useAsyncPanZoom' in params && params.useAsyncPanZoom;
};

Bookmark.prototype = {
  launch: function bookmark_launch() {
    var features = {
      name: this.manifest.name,
      icon: this.manifest.icons['60'],
      remote: true,
      useAsyncPanZoom: this.useAsyncPanZoom
    };

    window.open(this.url, '_blank', Object.keys(features).map(function(key) {
      return encodeURIComponent(key) + '=' + encodeURIComponent(features[key]);
    }).join(','));
  },

  uninstall: function bookmark_uninstall() {
    GridManager.uninstall(this);
  }
};
