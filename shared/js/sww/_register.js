function installServiceWorker() {
  if (typeof(navigator.serviceWorker) === 'undefined') {
    return Promise.reject(new Error('No SW support'));
  }

  return navigator.serviceWorker.getRegistration().then(function(reg) {
    if (!reg) {
      console.log('[SW REGISTERING] Registering sw');
      navigator.serviceWorker.register('/_sw.js').then(function() {
        window.location.reload();
        // TODO: Why rejecting here?
        return Promise.reject('Claiming SW');
      });
    } else {
      // TODO: Actually, we need to check if the scope is / because sw are
      // unique by scope.
      console.log('[SW REGISTERING] Already registered');
      return Promise.resolve();
    }
  }, function(err) {
    console.warn('[SW REGISTERING] Error getting registration:', err);
    return Promise.reject(err);
  });
}

function checkAppIsInstalled() {
  return new Promise(function(fulfill, reject) {
    var mozApps = window.navigator.mozApps;
    if (!mozApps) { fulfill(false); }

    var appRequest = window.navigator.mozApps.getSelf();
    appRequest.onsuccess = function() {
      var isInstalled = appRequest.result;
      fulfill(isInstalled);
    };
    // TODO: we should inform about the error.
    appRequest.onerror = reject;
  });
}

function installApp() {
  var mozApps = window.navigator.mozApps;
  if (!mozApps) {
    return Promise.reject(new Error('No mozApps, impossible to install.'));
  }
  return new Promise(function (fulfill, reject) {
    var tokens = document.location.pathname.split('/');
    tokens[tokens.length - 1] = '';
    var root = tokens.join('/');

    var manifestURL =
      document.location.protocol + '//' +
      document.location.hostname + root + 'manifest.webapp';

    var installRequest = window.navigator.mozApps.install(manifestURL);

    // TODO: Again, sanitize resolved values
    installRequest.onsuccess = fulfill;
    installRequest.onerror = reject;
  });
}

window.addEventListener('DOMContentLoaded', function() {
  checkAppIsInstalled().then(function (isInstalled) {
    return (isInstalled ? Promise.resolve() : installApp())
      .then(installServiceWorker);
  });
});
