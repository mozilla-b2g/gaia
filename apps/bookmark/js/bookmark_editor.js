'use strict';

/* global UrlHelper, BookmarksDatabase */
/* exported BookmarkEditor */

var BookmarkEditor = {
  init: function bookmarkEditor_show(options) {
    this.data = options.data;
    this.onsaved = options.onsaved;
    this.oncancelled = options.oncancelled;
    this._init();
  },

  _init: function bookmarkEditor_init() {
    this.bookmarkTitle = document.getElementById('bookmark-title');
    this.bookmarkUrl = document.getElementById('bookmark-url');
    this.cancelButton = document.getElementById('button-bookmark-cancel');
    this.addButton = document.getElementById('button-bookmark-add');

    this.cancelButton.addEventListener('click', this.close.bind(this));
    this.saveListener = this.save.bind(this);
    this.addButton.addEventListener('click', this.saveListener);

    this.bookmarkTitle.value = this.data.name || '';
    this.bookmarkUrl.value = this.data.url || '';

    this._checkURL();
    this.bookmarkUrl.addEventListener('input', this._checkURL.bind(this));
  },

  close: function bookmarkEditor_close() {
    this.oncancelled();
  },

  _checkURL: function bookmarkEditor_checkURL() {
    this.addButton.disabled = UrlHelper.isNotURL(this.bookmarkUrl.value);
  },

  save: function bookmarkEditor_save(evt) {
    this.addButton.removeEventListener('click', this.saveListener);

    // Only allow urls to be bookmarked.
    // This is defensive check - callers should filter out non-URLs.
    var url = this.bookmarkUrl.value;
    if (UrlHelper.isNotURL(url)) {
      this.oncancelled();
      return;
    }

    this.data.name = this.bookmarkTitle.value;
    this.data.bookmarkURL = url;

    BookmarksDatabase.add(this.data).then(this.onsaved.bind(this),
                                          this.close.bind(this));
  }
};
