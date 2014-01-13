var Radicale = require('./radicale');

/**
 * CaldavServer is used for testing the Calendar App.
 */
function CaldavServer() {}

CaldavServer.prototype = {
  server: new Radicale(),

  /**
   * interface: Start the server.
   *
   * @return {Number} Server port.
   */
  start: function() {
    return this.server.start();
  },

  /**
   * interface: Shutdown the server.
   *
   * @param {Function} callback execute after server is closed.
   */
  close: function(callback) {
    this.server.close(callback);
  },

  /**
   * interface: Add events for a specificed account.
   *
   * @param {String} account The account you would like to add event for.
   * @param {Array|Object} event The event
   */
  addEvent: function(account, event) {
    this.server.addEvent(account, event);
  },

  /**
   * interface: Clean all events for all accounts.
   */
  removeAllEvents: function() {
    this.server.removeAllEvents();
  }
};

module.exports = new CaldavServer();
