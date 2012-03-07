/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

window.addEventListener('DOMContentLoaded', function scanWifiNetworks(evt) {
  var minSignal, maxSignal;
  var p = document.querySelector('#status span');

  function newListItem(ssid, network) { // .ssid, .bssid, .flags, .signal
    var li = document.createElement('li');
    var br = document.createElement('br');
    var span = document.createElement('span');
    var small = document.createElement('small');
    var wifi = document.createElement('span');
    var signal = document.createElement('span');

    // ssid
    span.textContent = ssid;
    small.textContent = (network.flags) ? network.flags : 'open';

    // signal
    // level should be between 0 and 4
    var level = Math.ceil(4 * (network.signal - 100) / maxSignal);
    wifi.className = 'wifi';
    signal.className = 'wifi-signal' + Math.max(0, level);
    wifi.appendChild(signal);
    if (network.flags !== undefined) {
      var secure = document.createElement('span');
      secure.className = 'wifi-secure';
      wifi.appendChild(secure);
    }

    // create list item
    li.appendChild(span);
    li.appendChild(br);
    li.appendChild(small);
    li.appendChild(wifi);

    // bind connection callback
    li.onclick = function() {
      p.textContent = 'Connecting to ' + ssid + '…';
      var connection = navigator.mozWifiManager.select(network);
      connection.onsuccess = function() {
        p.textContent = ssid + ' connected!';
      };
      connection.onerror = function() {
        p.textContent = connection.error.message;
      };
    };
    return li;
  }

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
    maxSignal = -100 + networks[ssids[0]].signal;
    minSignal = -100 + networks[ssids[ssids.length - 1]].signal;
    for (var i = 0; i < ssids.length; i++) {
      var key = ssids[i];
      var li = newListItem(key, networks[key]);
      ul.appendChild(li);
    }
  };
  req.onerror = function(error) {
    p.textContent = 'error: '+ req.error.name;
  };
});
