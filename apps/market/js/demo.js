'use strict';

// this JS file is for Marketplace demo use only

var installButton = document.getElementById('install-button');

installButton.onclick = function installButton_install(evt) {
  var manifestUrl = evt.target.dataset.manifesturl;

  var request = window.navigator.mozApps.install(manifestUrl);
  request.onsuccess = function() {
    // do something after install successfully
    installButton.textContent = 'Installed';
  };
  request.onerror = function() {
    // Display the error information from the DOMError object
    alert('Install failed, error: ' + this.error.name);
  };

};

var GAIA_DOMAIN = 'gaiamobile.org';
var appName = 'market';

var homeButton = document.getElementById('home-button');
var appsButton = document.getElementById('apps-button');

homeButton.href = 'http://' + appName + '.' + GAIA_DOMAIN;
appsButton.href = 'http://' + appName + '.' + GAIA_DOMAIN;