define(function(require, exports, module) {
'use strict';

var Responder = require('responder');
var app = require('app');
var denodeifyAll = require('promise').denodeifyAll;

/**
 * Helper class to create accounts.
 * Emits events during the process of
 * creation to allow views to hook into
 * the full cycle while further separating
 * this logic from their own.
 *
 *
 * Events:
 *
 *    - authorize
 *    - calendar sync
 *
 *
 * @param {Calendar.App} app instance of app.
 */
function AccountCreation() {
  this.app = app;
  Responder.call(this);

  denodeifyAll(this, [ 'send' ]);
}
module.exports = AccountCreation;

AccountCreation.prototype = {
  __proto__: Responder.prototype,

  /**
   * Sends a request to create an account.
   *
   * @param {Calendar.Models.Account} model account details.
   * @param {Function} callback fired when entire transaction is complete.
   */
  send: function(model, callback) {
    var self = this;
    var accountStore = this.app.store('Account');
    var calendarStore = this.app.store('Calendar');

    // begin by persisting the account
    accountStore.verifyAndPersist(model, function(accErr, id, result) {

      if (accErr) {
        // we bail when we cannot create the account
        // but also give custom error events.
        self.emit('authorizeError', accErr);
        callback(accErr);
        return;
      }


      self.emit('authorize', result);

      // finally sync the account so when
      // we exit the request the user actually
      // has some calendars. This should not take
      // too long (compared to event sync).
      accountStore.sync(result, function(syncErr) {
        if (syncErr) {
          self.emit('calendarSyncError', syncErr);
          callback(syncErr);
          return;
        }

        function syncCalendars(err, calendars) {
          if (err) {
            console.error('Error fetch calendar list in account creation');
            return callback(err);
          }

          self.emit('calendarSync');

          // note we don't wait for any of this to complete
          // we just begin the sync and let the event handlers
          // on the sync controller do the work.
          for (var key in calendars) {
            self.app.syncController.calendar(
              result,
              calendars[key]
            );
          }

          callback(null, result);
        }

        // begin sync of calendars
        calendarStore.remotesByAccount(
          result._id,
          syncCalendars
        );
      });
    });
  }
};

});
