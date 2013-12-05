/**
 * Abstraction around search app.
 * @constructor
 * @param {Marionette.Client} client for operations.
 */
function Search(client) {
  this.client = client;
}

/**
 * @type String Origin of search app
 */
Search.URL = 'app://search.gaiamobile.org';

Search.Selectors = {
  searchInput: '#search-input',
  searchResults: 'iframe[mozapptype="mozsearch"]',
  statusBar: '#statusbar',
  firstContact: ''
};

Search.prototype = {
  /**
   * Launches search app and focuses on frame.
   */
  launch: function() {
    this.client.apps.launch(Search.URL);
    this.client.apps.switchToApp(Search.URL);
    this.client.helper.waitForElement('body');
  },

  relaunch: function() {
    this.client.apps.close(Search.URL);
    this.launch();
  }
};

module.exports = Search;
