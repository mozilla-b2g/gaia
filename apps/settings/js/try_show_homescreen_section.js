// We show the homescreen section if two or more Homescreens installed
(function() {
  'use strict';
  // Several parts of settings listening on application installs
  var appsMgmt = navigator.mozApps.mgmt;
  var homescreenCountKey = 'settings-homescreen-count';

  appsMgmt.oninstall = function(mgmtEvt) {
    var evt = new CustomEvent('applicationinstall', {
      bubbles: true,
      cancelable: false
    });
    evt.application = mgmtEvt.application;
    window.dispatchEvent(evt);
  };

  appsMgmt.onuninstall = function(mgmtEvt) {
    var evt = new CustomEvent('applicationuninstall', {
      bubbles: true,
      cancelable: false
    });
    evt.application = mgmtEvt.application;
    window.dispatchEvent(evt);
  };

  function updateHomescreenCachedValue() {
    appsMgmt.getAll().onsuccess = function countInstalledHomescreens(evt) {
      var numHomescreens = 0;
      evt.target.result.some(function(app) {
        if ((app.manifest || app.updateManifest).role === 'homescreen') {
          numHomescreens++;
        }
      });

      window.asyncStorage.setItem(homescreenCountKey, numHomescreens);
    };
  }

  // Show Homescreen section only if multiple installed
  function tryShowHomescreenSection(evt) {
    if (evt && evt.application) {
      var app = evt.application;
      if ((app.manifest || app.updateManifest).role !== 'homescreen')
        return;
    }

    window.asyncStorage.getItem(homescreenCountKey,
      function(cachedHomescreenCount) {
        // Should always have at least 1
        if (cachedHomescreenCount != null) {
          document.getElementById('homescreen-section').hidden =
            cachedHomescreenCount < 2;
        } else {
          window.asyncStorage.setItem(homescreenCountKey, 0);
          document.getElementById('homescreen-section').hidden = true;
        }

        var delay = 5000;
        setTimeout(updateHomescreenCachedValue.bind(this), delay);
    });
  }
  window.addEventListener('applicationinstall', tryShowHomescreenSection);
  window.addEventListener('applicationuninstall', tryShowHomescreenSection);

  tryShowHomescreenSection();
})();
