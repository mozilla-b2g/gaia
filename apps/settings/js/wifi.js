/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
'use strict';

window.addEventListener('DOMContentLoaded', function scanWifiNetworks(evt) {
  var wifiManager = navigator.mozWifiManager;

  // globals
  var gStatus = document.querySelector('#status small');
  var gList = document.querySelector('#wifi-networks');
  var gCurrentSSID = '';

  // current state
  function updateState() {
    var currentNetwork = wifiManager.connected;
    //var enabledBox = document.querySelector('input[name="wifi.enabled"]');
    var enabledBox = document.querySelector('#wifi input[type=checkbox]');
    if (currentNetwork) {
      gCurrentSSID = currentNetwork.ssid;
      gStatus.textContent = 'connected to ' + gCurrentSSID + '.';
      //enabledBox.checked = true;
    } else if (wifiManager.enabled) {
      gStatus.textContent = 'offline';
      //enabledBox.checked = true;
    } else {
      gStatus.textContent = 'disabled';
      //enabledBox.checked = false;
    }
    enabledBox.checked = wifiManager.enabled;
    dump('### ' + enabledBox.outerHTML + ' - ' + enabledBox.checked);
  }

  // toggle wifi on/off
  document.querySelector('#status input').onchange = function() {
    if (wifiManager.enabled) {
      wifiManager.setEnabled(false);
      while (gList.hasChildNodes())
        gList.removeChild(gList.lastChild);
      /*
      var li = document.createElement('li');
      var a = document.createElement('a');
      var label = document.createElement('label');
      var signal = document.createElement('signal');
      var secure = document.createElement('secure');
      */
      updateState();
    } else {
      wifiManager.setEnabled(true);
      wifiScanNetworks();
      updateState();
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
    li.onclick = function() {
      showNetwork(network);
    }
    return li;
  }

  function wifiConnect(network) {
    dump('### wifiConnect - ' + network.ssid + '\n');
    var connection = wifiManager.select(network);
    connection.onsuccess = function() {
      gStatus.textContent = 'Connecting to ' + network.ssid + '…';
      gCurrentSSID = network.ssid;
    };
    connection.onerror = function() {
      gStatus.textContent = connection.error.name;
    };
  }

  function wifiDisconnect(network) {
    // not working yet
  }

  // mozWifiManager events / callbacks
  wifiManager.onassociate = function(networkEvent) {
    gStatus.textContent = 'obtaining an IP address from ' + gCurrentSSID + '…';
    dump('### ' + gCurrentSSID + ' associated.\n');
  };
  wifiManager.onconnect = function(networkEvent) {
    gCurrentSSID = wifiManager.connected.ssid;
    gStatus.textContent = 'connected to ' + gCurrentSSID + '.';
    dump('### ' + gCurrentSSID + ' connected.\n');
  };
  wifiManager.ondisconnect = function() {
    gStatus.textContent = 'offline';
    dump('### ' + gCurrentSSID + ' disconnected.\n');
  };

  // scan wifi networks
  function wifiScanNetworks() {
    var req = wifiManager.getNetworks();
    req.onsuccess = function() {
      var networks = req.result;
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
    updateState();
  }

  function showNetwork(network) {
    //if (network.connected) {
    //if (network == wifiManager.connected) {
    var currentNetwork = wifiManager.connected;
    if (currentNetwork && currentNetwork.ssid == network.ssid) {
      // online: show status + offer to disconnect
      wifiDialog('#wifi-status', network, wifiDisconnect);
    }
    else {
      // offline: offer to connect
      if (/EAP$/.test(network.keyManagement))
        wifiDialog('#wifi-eap', network, wifiConnect);
      else if (/PSK$/.test(network.keyManagement))
        wifiDialog('#wifi-psk', network, wifiConnect);
      else
        wifiConnect(network);
    }
  }

  function wifiDialog(selector, network, callback) {
    var dialog = document.querySelector(selector);
    if (!dialog)
      return;
    if (!network)
      throw "no network!!!!";

    // network info
    var header = dialog.querySelector('header');
    if (header)
      header.textContent = network.ssid;
    var security = dialog.querySelector('dd[data-security]');
    if (security && network.keyManagement)
      security.textContent = network.keyManagement.join(', ');
    var signal = dialog.querySelector('dd[data-signal]');
    if (signal) {
      var levels = ['very weak', 'weak', 'average', 'good', 'very good'];
      var lvl = Math.min(Math.floor(network.signal / 20), 4);
      signal.textContent = levels[lvl];
    }

    // identity/password
    var identity = dialog.querySelector('input[name=identity]');
    if (identity)
      identity.value = network.identity;
    var password = dialog.querySelector('input[name=password]');
    if (password)
      password.value = network.password;
    var tShowPwd = dialog.querySelector('input[name=show-pwd]');
    if (tShowPwd)
      tShowPwd.onchange = function() {
        password.type = this.checked ? 'text' : 'password';
      };

    // hide dialog box
    function close() {
      document.body.classList.remove('dialog');
      dialog.classList.remove('active');
    }

    // OK|Cancel
    var buttons = dialog.querySelectorAll('footer button');
    buttons[0].onclick = function() { // OK
      close();
      if (identity)
        network.identity = identity.value;
      if (password) {
        network.password = password.value;
        //network.keyManagement = 'WPA-' + type.toUpperCase(); // XXX
        //network.keyManagement = 'WPA-EAP'; // XXX
        network.keyManagement = network.keyManagement[0]; // XXX
      }
      return callback ? callback(network) : null;
    };
    buttons[1].onclick = function() { // Cancel
      close();
      return null;
    };

    // show dialog box
    dialog.classList.add('active');
    document.body.classList.add('dialog');
    return dialog;
  }

  updateState();
  if (wifiManager.enabled)
    wifiScanNetworks();
});
