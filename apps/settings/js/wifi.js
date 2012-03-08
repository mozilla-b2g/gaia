/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
'use strict';

window.addEventListener('DOMContentLoaded', function scanWifiNetworks(evt) {
  var gToggle = document.querySelector('#status input');
  var gStatus = document.querySelector('#status small');
  var gList = document.querySelector('#wifi-networks');
  var gCurrentSSID = '';

  // current state
  var gCurrentNetwork = navigator.mozWifiManager.connected;
  function updateState() {
    //var enabledBox = document.querySelector('input[name="wifi.enabled"]');
    var enabledBox = document.querySelector('#wifi input[type=checkbox]');
    if (gCurrentNetwork) {
      gCurrentSSID = gCurrentNetwork.ssid;
      gStatus.textContent = 'connected to ' + gCurrentSSID + '.';
      enabledBox.checked = true;
    } else if (navigator.mozWifiManager.enabled) {
      gStatus.textContent = 'offline';
      enabledBox.checked = true;
    } else {
      gStatus.textContent = 'disabled';
      enabledBox.checked = false;
    }
    dump('### ' + enabledBox.outerHTML + ' - ' + enabledBox.checked);
  }

  gToggle.onclick = function() {
    if (navigator.mozWifiManager.enabled) {
      navigator.mozWifiManager.setEnabled(false);
      while (gList.hasChildNodes())
        gList.removeChild(gList.lastChild);
      /*
      var li = document.createElement('li');
      var a = document.createElement('a');
      var label = document.createElement('label');
      var signal = document.createElement('signal');
      var secure = document.createElement('secure');
      */
    } else {
      navigator.mozWifiManager.setEnabled(true);
      req = navigator.mozWifiManager.getNetworks();
    }
  }

  function newListItem(ssid, network) {
    // network = { ssid, bssid, keyManagement, signal }
    var li = document.createElement('li');
    var br = document.createElement('br');
    var span = document.createElement('span');
    var small = document.createElement('small');
    var label = document.createElement('label');
    var signal = document.createElement('span');

    // ssid
    span.textContent = ssid;
    small.textContent = (network.keyManagement.length) ?
      'secured by ' + network.keyManagement.join(', ') : 'open';

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
    if (1) li.onclick = function() {
      if (/EAP$/.test(network.keyManagement)) {
        network.identity = '********';
        network.password = '********';
        network.keyManagement = 'WPA-EAP';
        dump('### trying EAP auth…\n');
      }
      var connection = navigator.mozWifiManager.select(network);
      connection.onsuccess = function() {
        gStatus.textContent = 'Connecting to ' + ssid + '…';
        gCurrentSSID = ssid;
      };
      connection.onerror = function() {
        gStatus.textContent = connection.error.name;
      };
    };
    else li.onclick = function() {
      showNetwork(network);
    };
    return li;
  }

  // mozWifiManager events / callbacks
  navigator.mozWifiManager.onassociate = function(networkEvent) {
    gStatus.textContent = 'obtaining an IP address from ' + gCurrentSSID + ' …';
    dump('### ' + gCurrentSSID + ' associated.\n');
  };
  navigator.mozWifiManager.onconnect = function(networkEvent) {
    gCurrentSSID = navigator.mozWifiManager.connected.ssid;
    gStatus.textContent = 'connected to ' + gCurrentSSID + '.';
    dump('### ' + gCurrentSSID + ' connected.\n');
  };
  navigator.mozWifiManager.ondisconnect = function() {
    gStatus.textContent = 'offline';
    dump('### ' + gCurrentSSID + ' disconnected.\n');
  };

  // scan wifi networks
  var networks;
  var req = navigator.mozWifiManager.getNetworks();
  updateState();

  req.onsuccess = function() {
    networks = req.result;
    while (gList.hasChildNodes())
      gList.removeChild(gList.lastChild);
    var ssids = Object.getOwnPropertyNames(networks);
    ssids.sort(function(a, b) {
      return networks[b].signal - networks[a].signal;
    });
    for (var i = 0; i < ssids.length; i++) {
      var key = ssids[i];
      var li = newListItem(key, networks[key]);
      gList.appendChild(li);
    }
  };
  req.onerror = function(error) {
    gStatus.textContent = 'error: '+ req.error.name;
  };

  function showNetwork(network) {
    var dialog = document.querySelector('#wifi-eap');

    var header = dialog.querySelector('header');
    header.textContent = network.ssid;
    dump('### network = ' + network.ssid + '\n');

    var footer = dialog.querySelector('footer');
    var action = document.createElement('button');
    var cancel = document.createElement('button');
    action.textContent = 'disconnect';
    cancel.textContent = 'cancel';
    footer.appendChild(action);
    footer.appendChild(cancel);
    dump('### network = ' + network.ssid + '\n');

    body.className = 'dialog';
  }
});
