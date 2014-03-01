/**
 * Abstraction around Homescreen app.
 * @constructor
 * @param {Marionette.Client} client for operations.
 */
function Homescreen(client) {
  this.client = client;
}

var BookmarkEditor = require('./bookmark_editor');

/**
 * @type String Origin of Homescreen app
 */
Homescreen.URL = 'app://homescreen.gaiamobile.org';

Homescreen.Selectors = {
  searchBar: '#evme-activation-icon'
};

Homescreen.prototype = {
  get bookmarkEditor() {
    if (!this._bookmarkEditor) {
      this._bookmarkEditor = new BookmarkEditor(this.client);
    }
    return this._bookmarkEditor;
  },

  /**
   * Launches Homescreen app and focuses on frame.
   */
  launch: function() {
    this.client.apps.launch(Homescreen.URL);
    this.client.apps.switchToApp(Homescreen.URL);
    this.client.helper.waitForElement('body');
  },

  /**
   * Focuses on the searchbar
   */
  search: function() {
    var selectors = Homescreen.Selectors;
    this.client.helper.waitForElement(selectors.searchBar)
      .click();
  },

  close: function() {
    this.client.apps.close(Homescreen.URL);
  },

  backToApp: function() {
    this.client.switchToFrame();
    this.client.apps.switchToApp(Homescreen.URL);
  },

  getHomescreenIcon: function(title) {
    return this.client.findElement('li.icon[aria-label="' + title + '"]');
  },

  getLabelOfBookmark: function(title) {
    return this.client.findElement(
      'li.icon[aria-label="' + title + '"] span.labelWrapper > span');
  },

  switchToBookmarkEditorFrame: function() {
    this.bookmarkEditor.backToApp();
  }
};

module.exports = Homescreen;
