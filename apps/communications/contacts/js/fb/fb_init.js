var fb = window.fb || {};

if (typeof fb.init === 'undefined') {
  (function() {

    fb.isEnabled = false;

    fb.init = function(callback) {
      var req = utilities.config.load('/contacts/config.json');

      req.onload = function(configData) {
        if (configData.facebookEnabled === true) {
          fb.isEnabled = true;
        }

        fb.operationsTimeout = configData.operationsTimeout;
        fb.logLevel = configData.logLevel || 'none';
        fb.syncPeriod = configData.facebookSyncPeriod || 24;
        fb.testToken = configData.testToken;

        // The FB Contacts DB Cache is initialized regardless FB is enabled
        // or not. That's because we would like to avoid to add extra conditions
        // throughout the code, thus keeping it as simple as possible
        initalizeDB(callback);
      }

      req.onerror = function(code) {
        window.console.error('Contacts: Error while checking if FB is enabled',
                             code);

        // The FB Contacts DB Cache is initialized regardless FB is enabled
        // or not. That's because we would like to avoid to add extra conditions
        // throughout the code, thus keeping it as simple as possible
        initalizeDB(callback);
      }
    }

    function initalizeDB(cb) {
      fb.contacts.init(cb);
    }

  })();
}
