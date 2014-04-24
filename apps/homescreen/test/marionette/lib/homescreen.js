/**
 * Abstraction around Homescreen app.
 * @constructor
 * @param {Marionette.Client} client for operations.
 */
function Homescreen(client) {
  this.client = client;
}

var BookmarkEditor = require('./bookmark_editor');
var BookmarkRemover = require('./bookmark_remover');

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

  get bookmarkRemover() {
    if (!this._bookmarkRemover) {
      this._bookmarkRemover = new BookmarkRemover(this.client);
    }
    return this._bookmarkRemover;
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

  isHomescreenIcon: function(title) {
    this.client.executeScript(function(titleArg) {
      return !!document.querySelector('li.icon[aria-label="' + titleArg + '"]');
    }, [title]);
  },

  getHomescreenIcon: function(title) {
    return this.client.findElement('li.icon[aria-label="' + title + '"]');
  },

  getCrossElementForIcon: function(title) {
    return this.client.helper.waitForElement(
                      'li.icon[aria-label="' + title + '"] span.options');
  },

  waitForHomescreenIcon: function(title) {
    return this.client.helper.waitForElement('li.icon[aria-label="' + title +
                                             '"]');
  },

  getLabelOfBookmark: function(title) {
    return this.client.findElement(
      'li.icon[aria-label="' + title + '"] span.labelWrapper > span');
  },

  tap: function(icon) {
    icon.tap(0, 0);
  },

  isActive: function(icon) {
    return icon.scriptWith(function(el) {
      return el.classList.contains('active');
    });
  },

  getAppIcon: function(name) {
    return this.client.findElement(
                      'li[data-manifest-u-r-l*="' + name + '.gaiamobile.org"]');
  },

  switchToBookmarkEditorFrame: function() {
    this.bookmarkEditor.backToApp();
  },

  switchToBookmarkRemoverFrame: function() {
    this.bookmarkRemover.backToApp();
  }
};

module.exports = Homescreen;
