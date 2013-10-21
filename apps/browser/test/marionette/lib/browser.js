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
  'mailtoLink': '#mailto-link',
  'searchBar': '#url-input',
  'searchButton': '#url-button',
  'shareButton': '#share-button',
  'shareMenu': 'form[data-z-index-level="action-menu"]',
  'mozbrowser': 'iframe[mozbrowser]'
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
  get mailtoLink() {
    return findElement(this.client, 'mailtoLink');
  },

  get searchBar() {
    return findElement(this.client, 'searchBar');
  },

  get searchButton() {
    return findElement(this.client, 'searchButton');
  },

  get shareButton() {
    return findElement(this.client, 'shareButton');
  },

  // TODO(gareth): Move this shareMenu stuff into the helper.
  get shareMenu() {
    // Switch to the system app first.
    this.client.switchToFrame();
    return this.client.helper.waitForElement(Browser.Selectors['shareMenu']);
  },

  clickShareEmail: function() {
    var shareMenu = this.shareMenu;
    var list = shareMenu.findElements('button');
    for (var i = 0; i < list.length; i++) {
      var link = list[i];
      if (link.text() === 'E-Mail') {
        link.click();
        break;
      }
    }
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
