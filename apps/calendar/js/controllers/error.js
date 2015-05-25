define(function(require, exports, module) {
'use strict';

var Authentication = require('common/error').Authentication;
var InvalidServer = require('common/error').InvalidServer;
var Responder = require('common/responder');
var nextTick = require('common/next_tick');
var notification = require('notification');

/**
 * Global error handler / default handling for errors.
 */
function ErrorController() {
  Responder.call(this);
  this._handlers = Object.create(null);
}
module.exports = ErrorController;

ErrorController.prototype = {
  __proto__: Responder.prototype,

  /**
   * URL in which account errors are dispatched to.
   */
  accountErrorUrl: '/update-account/',

  /**
   * Dispatch an error event.
   *
   * If this type of event has been captured will be dispatched directly to
   * the callback provided. Otherwise the default behaviour will be triggered.
   *
   * @param {Calendar.Error} error to dispatch.
   */
  dispatch: function(error) {
    if (error instanceof Authentication || error instanceof InvalidServer) {
      this.handleAuthenticate(error.detail.account);
    }

    this.emit('error', error);
  },

  /**
   * Default handler for authentication errors.
   *
   * @param {Object} account to notify user about.
   * @param {Function} [callback] optional callback.
   */
  handleAuthenticate: function(account, callback) {
    if (!account) {
      return console.error('attempting to trigger reauth without an account');
    }

    // only trigger notification the first time there is an error.
    if (!account.error || account.error.count !== 1) {
      return nextTick(callback);
    }

    var lock = navigator.requestWakeLock('cpu');

    var l10n = navigator.mozL10n;
    var title = l10n.get('notification-error-sync-title');
    var description = l10n.get('notification-error-sync-description');

    var url = this.accountErrorUrl + account._id;
    notification.sendNotification(title, description, url).then(() => {
      callback && callback();
      lock.unlock();
    });
  }
};

});
