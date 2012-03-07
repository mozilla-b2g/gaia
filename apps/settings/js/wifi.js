/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

window.addEventListener('DOMContentLoaded', function scanWifiNetworks(evt) {
  var gStatus = document.querySelector('#status small');
  var gCurrentSSID = '';

  // current state
  var gCurrentNetwork = navigator.mozWifiManager.connected;
  var enabledBox = document.querySelector('input[name="wifi.enabled"]');
  if (gCurrentNetwork) {
    gCurrentSSID = gCurrentNetwork.ssid;
    gStatus.textContent = 'Connected to ' + gCurrentSSID;
    enabledBox.checked = true;
  } else {
    gStatus.textContent = 'Disconnected.';
    enabledBox.checked = false;
  }

  function newListItem(ssid, network) { // .ssid, .bssid, .keyManagement, .signal
    var li = document.createElement('li');
    var br = document.createElement('br');
    var span = document.createElement('span');
    var small = document.createElement('small');
    var label = document.createElement('label');
    var signal = document.createElement('span');

    // ssid
    span.textContent = ssid;
    small.textContent = (network.keyManagement) ? network.keyManagement : 'open';

    // signal is between 0 and 100, level should be between 0 and 4
    var level = Math.min(Math.floor(network.signal / 20), 4);
    label.className = 'wifi';
    signal.className = 'wifi-signal' + level;
    label.appendChild(signal);
    if (network.keyManagement.length) {
      var secure = document.createElement('span');
      secure.className = 'wifi-secure';
      label.appendChild(secure);
    }

    // create list item
    li.appendChild(span);
    li.appendChild(br);
    li.appendChild(small);
    li.appendChild(label);

    // bind connection callback
    li.onclick = function() {
      //gStatus.textContent = 'Connecting to ' + ssid + '…';
      var connection = navigator.mozWifiManager.select(network);
      connection.onsuccess = function() {
        //gStatus.textContent = ssid + ' connected!';
        gStatus.textContent = 'Connecting to ' + ssid + '…';
        gCurrentSSID = ssid;
      };
      connection.onerror = function() {
        gStatus.textContent = connection.error.name;
      };
    };
    return li;
  }

  // mozWifiManager events / callbacks
  navigator.mozWifiManager.onconnect = function(networkEvent) {
    //gStatus.textContent = networkEvent.ssid + ' connected.';
    gStatus.textContent = gCurrentSSID + ' connected.';
  };
  navigator.mozWifiManager.onassociate = function(networkEvent) {
    //gStatus.textContent = networkEvent.ssid + ' associated.';
    gStatus.textContent = gCurrentSSID + ' associated.';
  };
  navigator.mozWifiManager.ondisconnect = function() {
    gStatus.textContent = 'offline';
  };

  // scan wifi networks
  var networks;
  var ul = document.querySelector('#wifi-networks');
  var req = navigator.mozWifiManager.getNetworks();

  req.onsuccess = function() {
    networks = req.result;
    while (ul.hasChildNodes())
      ul.removeChild(ul.lastChild);
    var ssids = Object.getOwnPropertyNames(networks);
    ssids.sort(function(a, b) {
      return networks[b].signal - networks[a].signal;
    });
    for (var i = 0; i < ssids.length; i++) {
      var key = ssids[i];
      var li = newListItem(key, networks[key]);
      ul.appendChild(li);
    }
  };
  req.onerror = function(error) {
    gStatus.textContent = 'error: '+ req.error.name;
  };
});
