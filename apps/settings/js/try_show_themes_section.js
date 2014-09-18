// Shows the themes section only if two or more theme apps are installed
(function() {
  'use strict';
  var appsMgmt = navigator.mozApps.mgmt;
  var themeCount = 0;
  var scannedThemes= false;

  function updateThemesSectionVisibility() {
    var hideThemes = themeCount < 2;
    document.getElementById('themes-section').hidden = hideThemes;
  }

  function isTheme(app) {
    return (app.manifest || app.updateManifest).role === 'theme';
  }

  function isAppEventForThemes(evt) {
    if (evt && evt.application) {
      var app = evt.application;
      return isTheme(app);
    }

    return false;
  }

  function updateThemeCount(evt) {
    if (evt.type == 'applicationinstall') {
      themeCount++;
    } else {
      themeCount--;
    }

    updateThemesSectionVisibility();
  }

  function scanForThemes() {
    if (scannedThemes) {
      return;
    }

    appsMgmt.getAll().onsuccess = function countInstalledThemes(evt) {
      evt.target.result.some(function(app) {
          if (isTheme(app)) {
            themeCount++;
          }
      });

      scannedThemes = true;
      updateThemesSectionVisibility();
    };
  }

  function tryShowThemeSection(evt) {
    clearTimeout(timeout);
    if (isAppEventForThemes(evt) && scannedThemes) {
      updateThemeCount(evt);
    } else {
      scanForThemes();
    }
  }

  window.addEventListener('applicationinstall', tryShowThemeSection);
  window.addEventListener('applicationuninstall', tryShowThemeSection);

  var timeout = setTimeout(tryShowThemeSection, 200);
})();
