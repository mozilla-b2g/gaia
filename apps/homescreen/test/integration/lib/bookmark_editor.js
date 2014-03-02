var BookmarkEditor = function b_ctor(client) {
  this.client = client;
};

BookmarkEditor.Selectors = {
  'mozbrowser': '.inline-activity.active > iframe[mozbrowser]',
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
    this.client.helper.waitForElementToDisappear(this.currentTabFrame);
  }
};

module.exports = BookmarkEditor;
