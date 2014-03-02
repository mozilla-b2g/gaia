/*jshint node: true, browser: true */
/*global marionetteScriptFinished */

/**
 * Manipulates email's data APIs in the app.
 */
function EmailData(client) {
  this.client = client;
}
module.exports = EmailData;

EmailData.prototype = {
  /**
   * Gets the current account for the given account ID. Just returns the
   * _wireRep as that will survive the serialization hops.
   * @param  {String} accountId
   * @return {Object} the account._wireRep object, or undefined if not found.
   */
  getCurrentAccount: function() {
    var client = this.client;
    return client.executeAsyncScript(function() {
      var model = window.wrappedJSObject.require('model');
      model.latest('account', function(account) {
        marionetteScriptFinished(account._wireRep);
      });
    });
  },

  /**
   * Gets the current account for the given account ID. Just returns the
   * _wireRep as that will survive the serialization hops.
   * @param  {String} accountId
   * @return {Object} the account._wireRep object, or undefined if not found.
   */
  waitForCurrentAccountUpdate: function(key, value) {
    var client = this.client;
    return client.executeAsyncScript(function(key, value) {

      var account,
          model = window.wrappedJSObject.require('model'),
          acctsSlice = model.api.viewAccounts(false);

      function checkDone() {
        if (account[key] === value) {
          acctsSlice.die();
          marionetteScriptFinished(true);
        }
      }

      acctsSlice.oncomplete = function() {
        account = acctsSlice.defaultAccount;
        checkDone();
      };

      acctsSlice.onchange = function(item) {
        if (account) {
          if (account.id === item.id) {
            checkDone();
          }
        }
      };

    }, [key, value]);
  }
};

require('./debug')('email_data', EmailData.prototype);
