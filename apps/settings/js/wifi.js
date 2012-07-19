/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

window.addEventListener('localized', function scanWifiNetworks(evt) {
  var wifiManager = navigator.mozWifiManager;
  var settings = window.navigator.mozSettings;
  var _ = navigator.mozL10n.get;

  var gWifiCheckBox = document.querySelector('#wifi-enabled input[type=checkbox]');
  var gWifiInfoBlock = document.querySelector('#wifi-desc');

  // toggle wifi on/off
  gWifiCheckBox.onchange = function toggleWifi() {
    if (settings) {
      settings.getLock().set({'wifi.enabled': this.checked});
    }
  };

  /** mozWifiManager status
    * see dom/wifi/nsIWifi.idl -- the 4 possible statuses are:
    *  - connecting:
    *        fires when we start the process of connecting to a network.
    *  - associated:
    *        fires when we have connected to an access point but do not yet
    *        have an IP address.
    *  - connected:
    *        fires once we are fully connected to an access point and can
    *        access the internet.
    *  - disconnected:
    *        fires when we either fail to connect to an access point
    *          (transition: associated -> disconnected)
    *        or when we were connected to a network but have disconnected
    *          (transition: connected -> disconnected).
    */
  wifiManager.onstatuschange = function(event) {
    // update network status only if wifi is enabled.
    var req = settings.getLock().get('wifi.enabled');
    req.onsuccess = function wf_stateGet() {
      if (req.result['wifi.enabled']) {
        updateNetworkState();

        // refresh the network list when network is connected.
        if (event.status == 'connected') {
          gNetworkList.scan();
        }
      }
    }
  };

  // network list
  var gNetworkList = (function networkList(list) {
    var scanning = false;
    var autoscan = false;
    var scanRate = 5000; // 5s after last scan results
    var index = [];      // index of all scanned networks

    // private DOM helper: create a "Scanning..." list item
    function newScanItem() {
      var a = document.createElement('a');
      a.textContent = _('scanning');

      var span = document.createElement('span');
      span.className = 'wifi-search';

      var label = document.createElement('label');
      label.appendChild(span);

      var li = document.createElement('li');
      li.appendChild(a);
      li.appendChild(label);

      return li;
    }

    // private DOM helper: create a network list item
    function newListItem(network) {
      // ssid
      var ssid = document.createElement('a');
      ssid.textContent = network.ssid;

      // signal is between 0 and 100, level should be between 0 and 4
      var signal = document.createElement('span');
      var level = Math.min(Math.floor(network.relSignalStrength / 20), 4);
      signal.className = 'wifi-signal' + level;
      var label = document.createElement('label');
      label.className = 'wifi';
      label.appendChild(signal);

      // supported authentication methods
      var small = document.createElement('small');
      var keys = network.capabilities;
      if (keys && keys.length) {
        small.textContent = _('securedBy', { capabilities: keys.join(', ') });
        var secure = document.createElement('span');
        secure.className = 'wifi-secure';
        label.appendChild(secure);
      } else {
        small.textContent = _('securityOpen');
      }

      // create list item
      var li = document.createElement('li');
      li.appendChild(label);
      li.appendChild(small);
      li.appendChild(ssid);

      // bind connection callback
      li.onclick = function() {
        toggleNetwork(network);
      }
      return li;
    }

    // clear the network list
    function clear() {
      while (list.hasChildNodes()) {
        list.removeChild(list.lastChild);
      }
      index = [];
    };

    // scan wifi networks and display them in the list
    function scan() {

      if (scanning)
        return;

      // stop auto-scanning if wifi disabled or the app is hidden
      if (!wifiManager.enabled || document.mozHidden) {
        scanning = false;
        return;
      }

      var req = wifiManager.getNetworks();
      scanning = true;
      // clear list before starting scan
      clear();
      // add a "Searching..." box
      list.appendChild(newScanItem());

      req.onsuccess = function() {
        scanning = false;
        // clear list again for showing scaning result.
        clear();
        var networks = req.result;

        // sort networks: connected network first, then by signal strength
        var ssids = Object.getOwnPropertyNames(networks);
        ssids.sort(function(a, b) {
          return isConnected(networks[b]) ? 100 :
              networks[b].relSignalStrength - networks[a].relSignalStrength;
        });

        for (var i = 0; i < ssids.length; i++) {
          var network = networks[ssids[i]];
          var listItem = newListItem(network);
          if (network.connected)
            listItem.querySelector('small').textContent =
                _('shortStatus-connected');
          list.appendChild(listItem);
          index[network.ssid] = listItem; // add to index
        }

        // append 'scan again' button
        var button = document.createElement('button');
        button.textContent = _('scanNetworks');
        button.onclick = function() {
          scan();
        };
        var li = document.createElement('li');
        li.appendChild(button);
        list.appendChild(li);

        // auto-rescan if requested
        if (autoscan)
          window.setTimeout(scan, scanRate);
      };

      req.onerror = function(error) {
        scanning = false;
        console.warn('====== wifi error: ' + req.error.name);
        clear();

        // auto-rescan if requested
        if (autoscan)
          window.setTimeout(scan, scanRate);
      };

    };

    function display(ssid, message) {
      var listItem = index[ssid];
      var active = list.querySelector('.active');
      if (active && active != listItem) {
        active.className = '';
        active.querySelector('small').textContent =
            _('shortStatus-disconnected');
      }
      if (listItem) {
        listItem.className = 'active';
        listItem.querySelector('small').textContent = message;
      }
    }

    // API
    return {
      get autoscan() { return autoscan; },
      set autoscan(value) { autoscan = value; },
      display: display,
      clear: clear,
      scan: scan,
      get scanning() { return scanning; }
    };
  }) (document.getElementById('wifi-networks'));


  function isConnected(network) {
    // XXX the API should expose a 'connected' property on 'network',
    // and 'wifiManager.connection.network' should be comparable to 'network'.
    // Until this is properly implemented, we just compare SSIDs to tell wether
    // the network is already connected or not.
    var currentNetwork = wifiManager.connection.network;
    return currentNetwork && (currentNetwork.ssid == network.ssid);
  }

  // UI to connect/disconnect
  function toggleNetwork(network) {
    if (isConnected(network)) {
      // online: show status + offer to disconnect
      wifiDialog('#wifi-status', wifiDisconnect);
    } else if (network.password == '*') {
      // offline, known network (hence the '*' password value):
      // no further authentication required.
      setPassword();
      wifiConnect();
    } else {
      // offline, unknonw network: offer to connect
      var key = getKeyManagement();
      if (key == 'WEP') {
        wifiDialog('#wifi-wep', wifiConnect);
      } else if (key == 'WPA-PSK') {
        wifiDialog('#wifi-psk', wifiConnect);
      } else if (key == 'WPA-EAP') {
        wifiDialog('#wifi-eap', wifiConnect);
      } else {
        wifiConnect();
      }
    }

    function wifiConnect() {
      wifiManager.associate(network);
      gNetworkList.display(network.ssid, _('shortStatus-connecting'));
    }

    function wifiDisconnect() {
      wifiManager.forget(network);
      gNetworkList.display(network.ssid, _('shortStatus-disconnected'));
    }

    function getKeyManagement() {
      var key = network.capabilities[0];
      if (/WEP$/.test(key))
        return 'WEP';
      if (/PSK$/.test(key))
        return 'WPA-PSK';
      if (/EAP$/.test(key))
        return 'WPA-EAP';
      return '';
    }

    function setPassword(password) {
      var key = getKeyManagement();
      if (key == 'WEP') {
        network.wep = password;
      } else if (key == 'WPA-PSK') {
        network.psk = password;
      } else if (key == 'WPA-EAP') {
        network.password = password;
      }
      network.keyManagement = key;
    }

    // generic wifi property dialog
    // TODO: the 'OK' button should be disabled until the password string
    //       has a suitable length (e.g. 8..63)
    function wifiDialog(selector, callback) {
      var dialog = document.querySelector(selector);
      if (!dialog || !network)
        return null;

      // network info
      var ssid = dialog.querySelector('*[data-ssid]');
      if (ssid)
        ssid.textContent = network.ssid;

      var keys = network.capabilities;
      var security = dialog.querySelector('*[data-security]');
      if (security)
        security.textContent = (keys && keys.length) ?
            keys.join(', ') : _('securityNone');

      var signal = dialog.querySelector('*[data-signal]');
      if (signal) {
        var lvl = Math.min(Math.floor(network.relSignalStrength / 20), 4);
        signal.textContent = _('signalLevel' + lvl);
      }

      var speed = dialog.querySelector('*[data-speed]');
      if (speed) {
        speed.textContent = network.linkSpeed;
      }

      // identity/password
      var identity = dialog.querySelector('input[name=identity]');
      if (identity)
        identity.value = network.identity || '';

      var password = dialog.querySelector('input[name=password]');
      if (password) {
        password.type = 'password';
        password.value = network.password || '';
      }

      var showPassword = dialog.querySelector('input[name=show-pwd]');
      if (showPassword) {
        showPassword.checked = false;
        showPassword.onchange = function() {
          password.type = this.checked ? 'text' : 'password';
        };
      }

      // hide dialog box
      function close() {
        // reset identity/password fields
        if (identity)
          identity.value = '';
        if (password)
          password.value = '';
        if (showPassword)
          showPassword.checked = false;
        // 'close' (hide) the dialog
        document.body.classList.remove('dialog');
        dialog.classList.remove('active');
      }

      // OK|Cancel buttons
      var buttons = dialog.querySelectorAll('footer button');

      var okButton = buttons[0];
      okButton.onclick = function() {
        if (identity)
          network.identity = identity.value;
        if (password)
          setPassword(password.value);
        close();
        return callback ? callback() : false;
      };

      var cancelButton = buttons[1];
      cancelButton.onclick = function() {
        close();
        return;
      };

      // show dialog box
      dialog.classList.add('active');
      document.body.classList.add('dialog');
      return dialog;
    }
  }

  // current network state
  function updateNetworkState() {
    var currentNetwork = wifiManager.connection.network;
    var networkStatus = wifiManager.connection.status;
    //XXX: we need a 'initial' state
    if (networkStatus === "associated" || networkStatus === "connecting") {
      gWifiInfoBlock.textContent = _('fullStatus-connecting', currentNetwork);
    } else if (networkStatus === "connected") {
      gWifiInfoBlock.textContent = _('fullStatus-connected', currentNetwork);
    } else { 
      gWifiInfoBlock.textContent = _('fullStatus-disconnected');
    }
  }
  function setWifiEnabled(val) {
    gWifiCheckBox.checked = val;
    if (val) {
      updateNetworkState(); // update wifi state
      gNetworkList.scan(); // init network list
    } else {
      gWifiInfoBlock.textContent = _('disabled');
      gNetworkList.clear();
      gNetworkList.autoscan = false;
    }
  }
  /** mozWifiManager events / callbacks
    * requires bug 766497
    */
  if (settings) {
    // regiter observer
    settings.addObserver('wifi.enabled', function(event) {
      setWifiEnabled(event.settingValue);
    });

    // startup, update status
    var req = settings.getLock().get('wifi.enabled');
    req.onsuccess = function wf_EnabledSuccess() {
      var enabled = req.result['wifi.enabled'];
      setWifiEnabled(enabled);
    }
  }
});

