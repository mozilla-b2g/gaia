var fb = window.fb || {};
var config = window.config || {};

if (typeof fb.init === 'undefined') {
  (function() {

    fb.isEnabled = false;
    var initialized = false;

    fb.init = function(callback) {
      if (initialized) {
        callback();
        return;
      }
      initialized = true;
      var req = utils.config.load('/contacts/config.json');

      req.onload = function(configData) {
        if (configData.facebookEnabled === true) {
          fb.isEnabled = true;
        }

        fb.operationsTimeout = config.operationsTimeout =
                                                  configData.operationsTimeout;
        fb.logLevel = configData.logLevel || 'none';
        fb.syncPeriod = configData.facebookSyncPeriod || 24;
        fb.testToken = configData.testToken;

        callback();
      };

      req.onerror = function(code) {
        window.console.error('Contacts: Error while checking if FB is enabled',
                             code);
      };
    };
  })();
}
