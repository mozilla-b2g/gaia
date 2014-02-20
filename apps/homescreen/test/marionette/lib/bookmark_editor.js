var BookmarkEditor = function b_ctor(client) {
  this.client = client;
};

BookmarkEditor.Selectors = {
  'mozbrowser': '.inlineActivity.active > iframe[mozbrowser]',
  'bookmarkAddButton': '#button-bookmark-add',
  'bookmarkTitleField': '#bookmark-title',
  'bookmarkEntrySheetHead': '#bookmark-entry-sheet > header > h1'
};

BookmarkEditor.prototype = {
  get bookmarkAddButton() {
    return this.client.findElement(
      BookmarkEditor.Selectors['bookmarkAddButton']);
  },

  get bookmarkTitleField() {
    return this.client.findElement(
      BookmarkEditor.Selectors['bookmarkTitleField']);
  },

  get bookmarkEntrySheetHead() {
    return this.client.findElement(
      BookmarkEditor.Selectors['bookmarkEntrySheetHead']);
  },

  get currentTabFrame() {
    return this.client.findElement(
      BookmarkEditor.Selectors['mozbrowser']);
  },

  backToApp: function() {
    this.client.switchToFrame();
    this.client.switchToFrame(this.currentTabFrame);
  },

  waitForDisappearance: function() {
    this.client.switchToFrame();
    // there is no waitForElementToDisappear function in marionette-helper 0.0.9
    // so we port it from 0.1.0
    this.client.waitFor(function() {
      try {
        return !this.currentTabFrame.displayed();
      } catch (err) {
        if (err && err.type === 'StaleElementReference') {
          // the element was removed from the dom, we are done
          return true;
        }
        throw err;
      }
    });
  }
};

module.exports = BookmarkEditor;
