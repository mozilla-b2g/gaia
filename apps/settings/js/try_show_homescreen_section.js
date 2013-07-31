// We show the homescreen section if two or more Homescreens installed
(function() {
  'use strict';
  // Several parts of settings listening on application installs
  var appsMgmt = navigator.mozApps.mgmt;

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

  // Show Homescreen section only if multiple installed
  function tryShowHomescreenSection(evt) {
    if (evt && evt.application) {
      var app = evt.application;
      if ((app.manifest || app.updateManifest).role !== 'homescreen')
        return;
    }

    appsMgmt.getAll().onsuccess = function countInstalledHomescreens(evt) {
      var numHomescreens = 0;
      evt.target.result.some(function(app) {
        if ((app.manifest || app.updateManifest).role === 'homescreen') {
          numHomescreens++;
        }
        return numHomescreens > 1;
      });
      document.getElementById('homescreen-section').hidden =
        numHomescreens < 2;
    };
  }
  window.addEventListener('applicationinstall', tryShowHomescreenSection);
  window.addEventListener('applicationuninstall', tryShowHomescreenSection);

  tryShowHomescreenSection();
})();
