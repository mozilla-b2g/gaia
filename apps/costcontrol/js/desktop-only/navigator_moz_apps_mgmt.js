(function() {
  'use strict';

  if (navigator.mozApps.mgmt) {
    return;
  }

  const Apps = [{
    manifestURL: 'app://system.gaiamobile.org/manifest.webapp',
    origin: 'app://system.gaiamobile.org',
    manifest: {
      name: 'Service'
    }
  }];

  navigator.mozApps.mgmt = {
    getAll: function() {
      var returnResult = {};

      setTimeout(() => {
        returnResult.result = Apps;

        if (typeof returnResult.onsuccess === 'function') {
          returnResult.onsuccess.call(returnResult, {
            target: returnResult
          });
        }
      });

      return returnResult;
    }
  };
})();
