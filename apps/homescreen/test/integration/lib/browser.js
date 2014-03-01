/**
 * Abstraction around browser app.
 * @constructor
 * @param {Marionette.Client} client for operations.
 */
function Browser(client) {
  this.client = client;
}

/**
 * @type {string} Origin of browser app.
 */
Browser.URL = 'app://browser.gaiamobile.org';

Browser.Selectors = {
  'searchBar': '#url-input',
  'searchButton': '#url-button',
  'mozbrowser': 'iframe[mozbrowser]',
  'bookmarkButton': '#bookmark-button',
  'addToHomeButton': '#bookmark-menu-add-home'
};

/**
 * @private
 * @param {Marionette.Client} client for selector.
 * @param {String} name of selector [its a key in Browser.Selectors].
 */
function findElement(client, name) {
  return client.findElement(Browser.Selectors[name]);
}

Browser.prototype = {
  get searchBar() {
    return findElement(this.client, 'searchBar');
  },

  get searchButton() {
    return findElement(this.client, 'searchButton');
  },

  get bookmarkButton() {
    return findElement(this.client, 'bookmarkButton');
  },

  get addToHomeButton() {
    return findElement(this.client, 'addToHomeButton');
  },

  /**
   * Finds iframe of current running tab.
   */
  currentTabFrame: function() {
    // being really lazy right now and just finding first mozbrowser
    return this.client.findElement(Browser.Selectors.mozbrowser);
  },

  /**
   * Launches browser app and focuses on frame.
   */
  launch: function() {
    this.client.apps.launch(Browser.URL);
    this.client.apps.switchToApp(Browser.URL);
  },

  close: function() {
    this.client.apps.close(Browser.URL);
  },

  /**
   * Back to Browser app frame
   */
  backToApp: function() {
    this.client.switchToFrame();
    this.client.apps.switchToApp(Browser.URL);
  }
};

module.exports = Browser;
