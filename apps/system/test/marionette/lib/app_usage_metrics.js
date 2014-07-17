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
    var self = this;

    if (currentFrame) {
      this.client.switchToFrame();
    }

    var data = null;
    self.client.executeScript(function(app) {
      var metrics = window.wrappedJSObject.appUsageMetrics.metrics;
      return metrics.getAppUsage(app);
    }, [app], function(err, value) {
      if (currentFrame) {
        self.client.switchToFrame(currentFrame);
      }

      if (!err) {
        data = value;
      } else {
        console.log(err);
      }
    });

    return data ? (data[key] || defaultValue) : defaultValue;
  },

  /**
   * Start the AppUsageMetrics service and wait for it to finish
   */
  waitForStartup: function() {
    this.client.executeAsyncScript(function() {
      var AUM = window.wrappedJSObject.appUsageMetrics;
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
