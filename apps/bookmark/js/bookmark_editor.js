'use strict';

/* global UrlHelper, BookmarksDatabase */
/* exported BookmarkEditor */

var BookmarkEditor = {
  init: function bookmarkEditor_show(options) {
    this.data = options.data;
    this.onsaved = options.onsaved;
    this.oncancelled = options.oncancelled;
    var mode = 'add';
    BookmarksDatabase.get(this.data.url).then((function got(bookmark) {
      if (bookmark) {
        this.data = bookmark;
        mode = 'put';
      }
      this._init(mode);
    }).bind(this), this._init.bind(this, mode));
  },

  _init: function bookmarkEditor_init(mode) {
    this.mode = document.body.dataset.mode = mode;
    this.bookmarkTitle = document.getElementById('bookmark-title');
    this.bookmarkUrl = document.getElementById('bookmark-url');
    this.header = document.getElementById('bookmark-entry-header');
    this.saveButton = document.getElementById(mode === 'add' ? 'add-button' :
                                                               'edit-button');

    this.header.addEventListener('action', this.close.bind(this));
    this.saveListener = this.save.bind(this);
    this.saveButton.addEventListener('click', this.saveListener);

    this.bookmarkTitle.value = this.data.name || '';
    this.bookmarkUrl.value = this.data.url || '';

    this._checkDoneButton();
    this.form = document.getElementById('bookmark-form');
    this.form.addEventListener('input', this._checkDoneButton.bind(this));
    var touchstart = 'ontouchstart' in window ? 'touchstart' : 'mousedown';
    this.clearButton = document.getElementById('bookmark-title-clear');
    this.clearButton.addEventListener(touchstart, this._clearTitle.bind(this));
    if (mode === 'put') {
      this._onEditMode();
    }

    // We're appending new elements to DOM so to make sure headers are
    // properly resized and centered, we emmit a lazyload event.
    // This will be removed when the gaia-header web component lands.
    window.dispatchEvent(new CustomEvent('lazyload', {
      detail: document.body
    }));
  },

  _onEditMode: function bookmarkEditor_onEditMode() {
    // Done button will be disabled on edit mode once it is displayed
    this.saveButton.disabled = true;
  },

  close: function bookmarkEditor_close() {
    this.oncancelled();
  },

  _clearTitle: function bookmarkEditor_clearTitle(event) {
    event.preventDefault();
    this.bookmarkTitle.value = '';
    this._checkDoneButton();
  },

  _checkDoneButton: function bookmarkEditor_checkDoneButton() {
    // If one of the ﬁelds is blank, the “Done” button should be dimmed and
    // inactive
    var title = this.bookmarkTitle.value.trim();
    var url = this.bookmarkUrl.value.trim();
    this.saveButton.disabled = title === '' || url === '' ||
                               UrlHelper.isNotURL(url);
  },

  save: function bookmarkEditor_save(evt) {
    this.saveButton.removeEventListener('click', this.saveListener);

    // Only allow urls to be bookmarked.
    // This is defensive check - callers should filter out non-URLs.
    var url = this.bookmarkUrl.value.trim();
    if (UrlHelper.isNotURL(url)) {
      this.oncancelled();
      return;
    }

    this.data.name = this.bookmarkTitle.value;
    this.data.url = url;

    BookmarksDatabase[this.mode](this.data).then(this.onsaved.bind(this),
                                                 this.close.bind(this));
  }
};
