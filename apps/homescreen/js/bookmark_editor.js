'use strict';

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
  },

  close: function bookmarkEditor_close() {
    this.oncancelled();
  },

  save: function bookmarkEditor_save(evt) {
    this.addButton.removeEventListener('click', this.saveListener);

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
