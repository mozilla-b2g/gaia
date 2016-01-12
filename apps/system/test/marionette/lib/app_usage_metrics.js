'use strict';

function AppUsageMetrics(client) {
  this.client = client;
  this.data = null;
}

module.exports = AppUsageMetrics;

AppUsageMetrics.prototype = {
  client: null,
  data: null,

  /**
   * Get the number of times an app was opened then closed
   * @param {String} The app's base URL (without entry point)
   * @return {Integer}
   */
  getAppInvocations: function(app) {
    return this._getAppUsage(app, 'invocations', 0);
  },

  /**
   * Get the length of time an app was open for after closed
   * @param {String} The app's base URL (without entry point)
   * @return {Integer}
   */
  getAppUsageTime: function(app) {
    return this._getAppUsage(app, 'usageTime', 0);
  },

  /**
   * Get the number of times an app was installed
   * @param {String} The app's base URL (without entry point)
   * @return {Integer}
   */
  getAppInstalls: function(app) {
    return this._getAppUsage(app, 'installs', 0);
  },

  /**
   * Get the record of an app's uninstall, if it exists, or undefined.
   * @param {String} The app's base URL (without entry point)
   * @return {Integer}
   */
  getAppUninstalls: function(app) {
    return this._getAppUsage(app, 'uninstalls', 0);
  },

  /**
   * Refresh metrics data from the system app
   */
  _getAppUsage: function(app, key, defaultValue) {
    var currentFrame = this.client.frame;
    var client = this.client;
    var data = null;

    client.switchToFrame();
    client.waitFor(() => {
      data = client.executeScript(function(app) {
        var aum = window.wrappedJSObject.core.appUsageMetrics;
        var metrics = aum && aum.metrics;
        return metrics && metrics.getAppUsage(app);
      }, [app]);
      return !!data;
    });
    if (currentFrame) {
      client.switchToFrame(currentFrame);
    }
    return data ? (data[key] || defaultValue) : defaultValue;
  },

  waitForAUMInstance: function() {
    this.client.switchToFrame();
    this.client.waitFor(() => {
      return this.client.executeScript(function() {
        return window.wrappedJSObject.core.appUsageMetrics;
      });
    });
  },

  /**
   * Start the AppUsageMetrics service and wait for it to finish
   */
  waitForStartup: function() {
    this.waitForAUMInstance();
    this.client.executeAsyncScript(function() {
      var AUM = window.wrappedJSObject.core.appUsageMetrics;
      if (AUM.collecting) {
        marionetteScriptFinished();
        return;
      }

      AUM.startCollecting(function() {
        marionetteScriptFinished();
      });
    });
  }
};
