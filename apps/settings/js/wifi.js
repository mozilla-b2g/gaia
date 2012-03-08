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
      enabledBox.checked = true;
    } else if (wifiManager.enabled) {
      gStatus.textContent = 'offline';
      enabledBox.checked = true;
    } else {
      gStatus.textContent = 'disabled';
      enabledBox.checked = false;
    }
    dump('### ' + enabledBox.outerHTML + ' - ' + enabledBox.checked);
  }

  document.querySelector('#status input').onclick = function() {
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
    } else {
      wifiManager.setEnabled(true);
      req = wifiManager.getNetworks();
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
      wifiAuthenticate(network, wifiConnect);
    };
    else li.onclick = function() {
      showNetwork(network);
    };
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
  var networks;
  var req = wifiManager.getNetworks();
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
  updateState();

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

  function wifiAuthenticate(network, callback) {
    var type;
    if (/EAP$/.test(network.keyManagement))
      type = 'eap';
    else if (/PSK$/.test(network.keyManagement))
      type = 'psk';
    else
      return callback(network);
    var dialog = document.querySelector('#wifi-' + type);

    function close() { // hide  dialog box
      document.body.classList.remove('dialog');
      dialog.classList.remove('active');
    }

    // identity/password
    var identity = dialog.querySelector('input[name=identity]');
    var password = dialog.querySelector('input[name=password]');
    dialog.querySelector('input[name=show-pwd]').onchange = function() {
      password.type = this.checked ? 'text' : 'password';
    };
    identity.value = network.identity;
    password.value = network.password;

    // OK|Cancel
    var buttons = dialog.querySelectorAll('footer button');
    buttons[0].onclick = function() { // OK
      close();
      network.identity = identity.value;
      network.password = password.value;
      network.keyManagement = 'WPA-' + type.toUpperCase(); // XXX
      return callback(network);
    };
    buttons[1].onclick = function() { // Cancel
      close();
      return null;
    };

    // show dialog box
    dialog.classList.add('active');
    document.body.classList.add('dialog');
  }
});
