require('/tests/js/app_integration.js');
require('/tests/js/integration_helper.js');

function SystemIntegration() {
  AppIntegration.apply(this, arguments);
}

SystemIntegration.prototype = {
  __proto__: AppIntegration.prototype,

  appName: 'System',

  selectors: {
    /** notifications */
    notificationsContainer: '#notifications-container'
  },

  /**
   * Override base launch method.
   * The system app is launched by directly
   * going to its url we we determine by getting
   * all the apps and finding the 'System' apps origin.
   */
  launch: function(callback) {
    var self = this;
    this.task(function(app, next, done) {
      var device = app.device;
      yield device.setScriptTimeout(5000);

      yield IntegrationHelper.importScript(
        device,
        '/tests/atoms/gaia_apps.js',
        MochaTask.nodeNext
      );

      var result = yield device.executeAsyncScript(
        'GaiaApps.locateWithName("' + self.appName + '");'
      );

      // locate the origin of the system app.
      // We must append the /index.html because of the app:// protocol.
      yield device.goUrl(result.origin + '/index.html');

      // complete the task
      done();
    }, callback);
  }

};
