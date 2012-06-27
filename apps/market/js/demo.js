'use strict';

// this JS file is for Marketplace demo use only

var installButton = document.getElementById('install-button');

installButton.onclick = function installButton_install(evt) {
  var manifestUrl = evt.target.dataset.manifesturl;

  var request = window.navigator.mozApps.install(manifestUrl);
  request.onsuccess = function() {
    // do something after install successfully
  };
  request.onerror = function() {
    // Display the error information from the DOMError object
    alert('Install failed, error: ' + this.error.name);
  }; 

};
