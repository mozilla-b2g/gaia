// We show the homescreen section if two or more Homescreens installed
(function() {
  'use strict';
  // Several parts of settings listening on application installs
  var appsMgmt = navigator.mozApps.mgmt;
  var homescreenCount = 0;
  var scannedHomescreens = false;

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

  function updateHomescreenSectionVisibility() {
    var hideHomescreen = homescreenCount < 2;
    document.getElementById('homescreen-section').hidden = hideHomescreen;
  };

  function isHomescreen(app) {
    return (app.manifest || app.updateManifest).role === 'homescreen';
  }

  function isAppEventForHomescreen(evt) {
    if (evt && evt.application) {
      var app = evt.application;
      return isHomescreen(app);
    }

    return false;
  }

  function updateHomescreenCount(evt) {
    if (evt.type == 'applicationinstall') {
      homescreenCount++;
    } else {
      homescreenCount--;
    }

    updateHomescreenSectionVisibility();
  }

  function scanForHomescreens() {
    if (scannedHomescreens) {
      return;
    }

    appsMgmt.getAll().onsuccess = function countInstalledHomescreens(evt) {
      evt.target.result.some(function(app) {
          if (isHomescreen(app)) {
            homescreenCount++;
          }
      });

      scannedHomescreens = true;
      updateHomescreenSectionVisibility();
    };
  }

  // Show Homescreen section only if multiple installed
  function tryShowHomescreenSection(evt) {
    if (isAppEventForHomescreen(evt) && scannedHomescreens) {
      updateHomescreenCount(evt);
    } else {
      scanForHomescreens();
    }
  }

  window.addEventListener('applicationinstall', tryShowHomescreenSection);
  window.addEventListener('applicationuninstall', tryShowHomescreenSection);

  // Calling appsMgmt.getAll is expensive
  // Delay it until Settings is doing nothing else
  // See bug 958318
  // 4s timer because settings.js already has a 3s timer
  navigator.addIdleObserver({
    time: 4,
    onidle: function() {
      navigator.removeIdleObserver(this);
      tryShowHomescreenSection();
    }
  });
})();
