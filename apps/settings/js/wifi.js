/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

window.addEventListener('DOMContentLoaded', function scanWifiNetworks(evt) {
  var wifiManager = navigator.mozWifiManager || { connected: null };

  // globals
  var gStatus = document.querySelector('#status small');
  var gList = document.querySelector('#wifi-networks');

  // TODO:
  // the current wifi API does not always attach an 'ssid' property to 'network'
  // objects. We use this global SSID variable until this bug is fixed.
  var gCurrentSSID = '';

  // current state
  // XXX we need an event to know when the wifi is reallly enabled/disabled,
  // and this function should be called by an event listener.
  function updateState() {
    var currentNetwork = wifiManager.connected;
    var enabledBox = document.querySelector('#wifi input[type=checkbox]');
    if (currentNetwork) {
      gCurrentSSID = currentNetwork.ssid;
      gStatus.textContent = 'connected to ' + gCurrentSSID + '.';
      enabledBox.checked = true;
    } else if (wifiManager.enabled) {
      gStatus.textContent = 'offline';
      enabledBox.checked = true;
    } else {
      gStatus.textContent = 'disabled';
      enabledBox.checked = false;
    }
  }

  // toggle wifi on/off
  document.querySelector('#status input').onchange = function() {
    if (wifiManager.enabled) {
      wifiManager.setEnabled(false);
      while (gList.hasChildNodes())
        gList.removeChild(gList.lastChild);
      updateState();
    } else {
      wifiManager.setEnabled(true);
      wifiScanNetworks();
      updateState();
    }
  }

  function newListItem(ssid, network) {
    // network = {
    //   ssid          : SSID string (human-readable name)
    //   bssid         : network identifier string
    //   keyManagement : array of strings (supported authentication methods)
    //   signal        : 0-100 signal level (integer)
    // }

    // ssid
    var span = document.createElement('span');
    span.textContent = ssid;

    // supported authentication methods
    var small = document.createElement('small');
    var keys = network.keyManagement;
    small.textContent = keys.length ? 'secured by ' + keys.join(', ') : 'open';

    // signal is between 0 and 100, level should be between 0 and 4
    var signal = document.createElement('span');
    var level = Math.min(Math.floor(network.signal / 20), 4);
    signal.className = 'wifi-signal' + level;
    var label = document.createElement('label');
    label.className = 'wifi';
    label.appendChild(signal);
    if (network.keyManagement.length) {
      var secure = document.createElement('span');
      secure.className = 'wifi-secure';
      label.appendChild(secure);
    }

    // create list item
    var li = document.createElement('li');
    li.appendChild(span);
    li.appendChild(small);
    li.appendChild(label);

    // bind connection callback
    li.onclick = function() {
      showNetwork(network);
    }
    return li;
  }

  function wifiConnect(network) {
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
  };

  wifiManager.onconnect = function(networkEvent) {
    gCurrentSSID = wifiManager.connected.ssid;
    gStatus.textContent = 'connected to ' + gCurrentSSID + '.';
  };

  wifiManager.ondisconnect = function() {
    gStatus.textContent = 'offline';
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
      gStatus.textContent = 'error: ' + req.error.name;
    };
    updateState();
  }

  function showNetwork(network) {
    // TODO: use (network.connected) or (wifiManager.connected) instead
    var currentNetwork = wifiManager.connected;
    if (currentNetwork && currentNetwork.ssid == network.ssid) {
      // online: show status + offer to disconnect
      wifiDialog('#wifi-status', network, wifiDisconnect);
    }
    else {
      // offline: offer to connect
      if (/EAP$/.test(network.keyManagement)) {
        wifiDialog('#wifi-eap', network, wifiConnect);
      }
      else if (/PSK$/.test(network.keyManagement)) {
        wifiDialog('#wifi-psk', network, wifiConnect);
      }
      else {
        wifiConnect(network);
      }
    }
  }

  function wifiDialog(selector, network, callback) {
    var dialog = document.querySelector(selector);
    if (!dialog)
      return;

    if (!network)
      throw 'no network!';

    // network info
    var header = dialog.querySelector('header');
    if (header)
      header.textContent = network.ssid;

    var keys = network.keyManagement;
    var security = dialog.querySelector('dd[data-security]');
    if (security)
      security.textContent = (keys && keys.length) ? keys.join(', ') : 'none';

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

    var showPassword = dialog.querySelector('input[name=show-pwd]');
    if (showPassword)
      showPassword.onchange = function() {
        password.type = this.checked ? 'text' : 'password';
      };

    // hide dialog box
    function close() {
      document.body.classList.remove('dialog');
      dialog.classList.remove('active');
    }

    // OK|Cancel
    var buttons = dialog.querySelectorAll('footer button');
    var okButton = buttons[0];
    okButton.onclick = function() {
      close();
      if (identity)
        network.identity = identity.value;
      if (password) {
        network.password = password.value;
        // XXX temporary workaround:
        // the API should not require to assign any string to 'keyManagement',
        // which is an *array*. A distinct property will be used instead.
        network.keyManagement = network.keyManagement[0];
      }
      return callback ? callback(network) : null;
    };
    var cancelButton = buttons[1];
    cancelButton.onclick = function() {
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
