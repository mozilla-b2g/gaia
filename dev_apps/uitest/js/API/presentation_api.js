'use strict';

window.addEventListener('DOMContentLoaded', function() {
  function log(aMsg) {
    console.log('-*- mdns.js : ' + aMsg + '\n');
  }

  if (typeof navigator.mozPresentationDeviceInfo !== 'undefined') {
    navigator.mozPresentationDeviceInfo.addEventListener('devicechange',
      function(e) {
        log('device changed');
        getAll();
      });

    document.getElementById('discovery').onclick = function _discovery() {
      log('discovery');
      navigator.mozPresentationDeviceInfo.forceDiscovery();
      getAll();
    };

    getAll();
  }

  function appendDevice(device) {
    var node = document.createElement('li');
    var textnode = document.createTextNode(device.name);
    node.appendChild(textnode);
    document.getElementById('devices').appendChild(node);
  }

  function clearDevices() {
    var devNode = document.getElementById('devices');
    while (devNode.firstChild) {
      devNode.removeChild(devNode.firstChild);
    }
  }

  function getAll() {
    log('getAll');
    navigator.mozPresentationDeviceInfo.getAll().then(function(devices) {
      log('devices found: ' + devices.length);
      clearDevices();
      for (var device of devices) {
        appendDevice(device);
      }
    });
  }
});
