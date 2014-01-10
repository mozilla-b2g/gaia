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
        if (cachedHomescreenCount) {
          document.getElementById('homescreen-section').hidden =
            cachedHomescreenCount < 2;
        } else {
          window.asyncStorage.setItem(homescreenCountKey, 0);
          document.getElementById('homescreen-section').hidden = true;
        }
    });
  }

  window.addEventListener('applicationinstall', tryShowHomescreenSection);
  window.addEventListener('applicationuninstall', tryShowHomescreenSection);

  // Calling appsMgmt.getAll is expensive
  // So delay it until Settings is doing nothing else
  // See bug 958318
  // 4 Seconds because main settings has idle timer of 3 s
  navigator.addIdleObserver({
    time: 4,
    onidle: updateHomescreenCachedValue
  });

  tryShowHomescreenSection();
})();
