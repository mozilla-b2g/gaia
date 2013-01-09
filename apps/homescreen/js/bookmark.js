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
      name: this.manifest.name.replace(/\s/g, '&nbsp;'),
      icon: this.manifest.icons['60'],
      remote: true,
      useAsyncPanZoom: this.useAsyncPanZoom
    };

    // The third parameter is received in window_manager without whitespaces
    // so we decice replace them for &nbsp;
    window.open(this.url, '_blank', JSON.stringify(features));
  },

  uninstall: function bookmark_uninstall() {
    GridManager.uninstall(this);
  }
};

var BookmarkEditor = {
  init: function bookmarkEditor_show(options) {
    this.data = options.data;
    this.onsaved = options.onsaved;
    this.oncancelled = options.oncancelled;
    this.bookmarkEntrySheet = document.getElementById('bookmark-entry-sheet');
    this.bookmarkTitle = document.getElementById('bookmark-title');
    this.bookmarkUrl = document.getElementById('bookmark-url');
    this.cancelButton = document.getElementById('button-bookmark-cancel');
    this.addButton = document.getElementById('button-bookmark-add');

    this.cancelButton.addEventListener('click', this.close.bind(this));
    this.addButton.addEventListener('click', this.save.bind(this));

    this.bookmarkTitle.value = this.data.name || '';
    this.bookmarkUrl.value = this.data.url || '';

    this.origin = document.location.protocol + '//homescreen.' +
      document.location.host.replace(/(^[\w\d]+.)?([\w\d]+.[a-z]+)/, '$2');
  },

  close: function bookmarkEditor_close() {
    this.oncancelled();
  },

  save: function bookmarkEditor_save() {
    // Only allow http(s): urls to be bookmarked.
    if (/^https?:/.test(this.bookmarkUrl.value) == false)
      return;

    this.data.name = this.bookmarkTitle.value;
    this.data.bookmarkURL = this.bookmarkUrl.value;

    var homeScreenWindow = window.open('', 'main');
    if (!homeScreenWindow)
      this.close();
    else {
      homeScreenWindow.postMessage(
        new Message(Message.Type.ADD_BOOKMARK, this.data), this.origin);
      this.onsaved();
    }
  }
};

