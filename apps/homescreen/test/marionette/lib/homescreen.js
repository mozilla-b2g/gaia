/**
 * Abstraction around Homescreen app.
 * @constructor
 * @param {Marionette.Client} client for operations.
 */
function Homescreen(client) {
  this.client = client;
}

/**
 * @type String Origin of Homescreen app
 */
Homescreen.URL = 'app://homescreen.gaiamobile.org';

Homescreen.Selectors = {
  searchBar: '#evme-activation-icon'
};

Homescreen.prototype = {
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
  }
};

module.exports = Homescreen;
