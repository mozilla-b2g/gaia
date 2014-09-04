Calendar.ns('Controllers').Error = (function() {
  'use strict';

  /**
   * Global error handler / default handling for errors.
   *
   * @param {Calendar.App} app current application.
   */
  function ErrorController(app) {
    Calendar.Responder.call(this);

    this.app = app;
    this._handlers = Object.create(null);
  }

  ErrorController.prototype = {
    __proto__: Calendar.Responder.prototype,

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
      if (
        error instanceof Calendar.Error.Authentication ||
        error instanceof Calendar.Error.InvalidServer
      ) {
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
        return Calendar.nextTick(callback);
      }

      var l10n = navigator.mozL10n;
      var title = l10n.get('notification-error-sync-title'),
          description = l10n.get('notification-error-sync-description'),
          url = this.accountErrorUrl + account._id;

      var lock = navigator.requestWakeLock('cpu');
      return Calendar.sendNotification(title, description, url).then(() => {
        lock.unlock();
        return callback && callback(account.error);
      });
    }
  };

  return ErrorController;

}());
