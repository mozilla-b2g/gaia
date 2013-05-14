Calendar.ns('Controllers').Error = (function() {

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
      if (!account)
        return console.error('attempting to trigger reauth without an account');

      // only trigger notification the first time there is an error.
      if (!account.error || account.error.count !== 1) {
        return Calendar.nextTick(callback);
      }

      var lock = navigator.requestWakeLock('cpu');

      var title =
        navigator.mozL10n.get('notification-error-sync-title');

      var description =
        navigator.mozL10n.get('notification-error-sync-description');

      var url = this.accountErrorUrl + account._id;

      this.app.loadObject('Notification', function() {
        Calendar.Notification.send(
          title,
          description,
          url,
          function() {
            callback && callback();
            lock.unlock();
          }
        );
      });
    }
  };

  return ErrorController;

}());
