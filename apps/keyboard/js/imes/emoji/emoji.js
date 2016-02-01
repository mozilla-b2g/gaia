/* global InputMethods, PromiseStorage*/


'use strict';

(function() {
  function RecentKeys() {
    this._items = [];
  }

  RecentKeys.prototype.RECENT_KEY_COUNT = 18;

  RecentKeys.prototype.getItems = function() {
    return this._items || [];
  };

  RecentKeys.prototype.setItems = function(val) {
    if (Array.isArray(val) && val.length) {
      this._items = val.slice(0, this.RECENT_KEY_COUNT);
    }
  };

  RecentKeys.prototype.getPanelKeys = function() {
    if (!this._items) {
      throw new Error('Emoji:Unable to get recently used keys');
    }

    return this.getItems().map(function(val) {
      return { compositeKey: val, type: 'emoji' };
    });
  };

  RecentKeys.prototype.add = function(key) {
    var duplicateKeyIndex = this._items.indexOf(key);

    // splice an element from array can always reduce length by 1.
    // this ensure that we remove the last element or existent key,
    // before unshifting clicked key into array.
    if (this._items.length >= this.RECENT_KEY_COUNT ||
        duplicateKeyIndex !== -1) {
      this._items.splice(duplicateKeyIndex, 1);
    }

    this._items.unshift(key);
  };

  function EmojiInputMethod() {
    this._glue = null;
    this._dbStore = null;
    this._recentKeys = new RecentKeys();
  }

  EmojiInputMethod.prototype.EMOJI_DB_NAME = 'Emoji';
  EmojiInputMethod.prototype.EMOJI_RECENT_STORE_KEY = 'emojiRecentUsedKeys';

  EmojiInputMethod.prototype.init = function(glue) {
    this._glue = glue;
    this._dbStore = new PromiseStorage(this.EMOJI_DB_NAME);

    var p = this._dbStore.start()
    .then(function() {
      return this._dbStore.getItem(this.EMOJI_RECENT_STORE_KEY);
    }.bind(this))
    .then(function(keys) {
      this._recentKeys.setItems(keys);
    }.bind(this));

    return p;
  };

  EmojiInputMethod.prototype.deactivate = function() {
    return this._dbStore.setItem(
      this.EMOJI_RECENT_STORE_KEY, this._recentKeys.getItems());
  };

  EmojiInputMethod.prototype.click = function(key, repeat) {
    return this._glue.sendKey(key, repeat);
  };

  EmojiInputMethod.prototype.handleKey = function(key, repeat) {
    this._recentKeys.add(key.key);

    return  this._glue.sendKey(key, repeat);
  };

  EmojiInputMethod.prototype.updatePageKeys = function(page) {
    page.panelKeys = this._recentKeys.getPanelKeys();
    return page;
  };


  InputMethods.emoji = new EmojiInputMethod();
}());
