'use strict';

/* global Message, UrlHelper */
/* exported BookmarkEditor */

var BookmarkEditor = {
  init: function bookmarkEditor_show(options) {
    this.data = options.data;
    this.onsaved = options.onsaved;
    this.oncancelled = options.oncancelled;
    this.origin = document.location.protocol + '//homescreen.' +
          document.location.host.replace(/(^[\w\d]+.)?([\w\d]+.[a-z]+)/, '$2');
    if (document.readyState === 'complete' ||
        document.readyState === 'interactive') {
      this._init();
    } else {
      var self = this;
      document.addEventListener('DOMContentLoaded', function loaded() {
        document.removeEventListener('DOMContentLoaded', loaded);
        self._init();
      });
    }
  },

  _init: function bookmarkEditor_init() {
    document.getElementById('bookmark-form').onsubmit = function() {
      return false;
    };
    this.bookmarkEntrySheet = document.getElementById('bookmark-entry-sheet');
    this.bookmarkTitle = document.getElementById('bookmark-title');
    this.bookmarkUrl = document.getElementById('bookmark-url');
    this.cancelButton = document.getElementById('button-bookmark-cancel');
    this.addButton = document.getElementById('button-bookmark-add');

    this.cancelButton.addEventListener('click', this.close.bind(this));
    this.saveListener = this.save.bind(this);
    this.addButton.addEventListener('click', this.saveListener);
    this.addButton.removeAttribute('disabled');

    this.bookmarkTitle.value = this.data.name || '';
    this.bookmarkUrl.value = this.data.url || '';

    if (!UrlHelper.isURL(this.bookmarkUrl.value)) {
      this.addButton.disabled = 'disabled';
    }

    this.bookmarkUrl.addEventListener('keydown', (function() {
      if (UrlHelper.isURL(this.bookmarkUrl.value)) {
        this.addButton.disabled = '';
      } else {
        this.addButton.disabled = 'disabled';
      }
    }).bind(this), false);
  },

  close: function bookmarkEditor_close() {
    this.oncancelled();
  },

  save: function bookmarkEditor_save(evt) {
    this.addButton.removeEventListener('click', this.saveListener);

    // Only allow urls to be bookmarked.
    // This is defensive check - callers should filter out non-URLs.
    if (UrlHelper.isNotURL(this.bookmarkUrl.value)) {
      this.oncancelled();
      return;
    }

    this.data.name = this.bookmarkTitle.value;
    this.data.bookmarkURL = this.bookmarkUrl.value;

    var homeScreenWindow = window.open('', 'main');
    // This should only happen when the activity is run without a homescreen,
    // for example in unit tests.
    if (!homeScreenWindow) {
      this.close();
    } else {
      homeScreenWindow.postMessage(
        new Message(Message.Type.ADD_BOOKMARK, this.data), this.origin);
      this.onsaved();
    }
  }
};
