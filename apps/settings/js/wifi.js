/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// create a fake mozWifiManager if required (e.g. desktop browser)
var gWifiManager = (function(window) {
  var navigator = window.navigator;

  try {
    if ('mozWifiManager' in navigator)
      return navigator.mozWifiManager;
  } catch (e) {
    //Bug 739234 - state[0] is undefined when initializing DOMWifiManager
    dump(e);
  }

  /** fake network list, where each network object looks like:
    * {
    *   ssid              : SSID string (human-readable name)
    *   bssid             : network identifier string
    *   capabilities      : array of strings (supported authentication methods)
    *   relSignalStrength : 0-100 signal level (integer)
    *   connected         : boolean state
    * }
    */
  var fakeNetworks = {
    'Mozilla-G': {
      ssid: 'Mozilla-G',
      bssid: 'xx:xx:xx:xx:xx:xx',
      capabilities: ['WPA-EAP'],
      relSignalStrength: 67,
      connected: false
    },
    'Livebox 6752': {
      ssid: 'Livebox 6752',
      bssid: 'xx:xx:xx:xx:xx:xx',
      capabilities: ['WEP'],
      relSignalStrength: 32,
      connected: false
    },
    'Mozilla Guest': {
      ssid: 'Mozilla Guest',
      bssid: 'xx:xx:xx:xx:xx:xx',
      capabilities: [],
      relSignalStrength: 98,
      connected: false
    },
    'Freebox 8953': {
      ssid: 'Freebox 8953',
      bssid: 'xx:xx:xx:xx:xx:xx',
      capabilities: ['WPA2-PSK'],
      relSignalStrength: 89,
      connected: false
    }
  };

  return {
    // true if the wifi is enabled
    enabled: false,

    // enables/disables the wifi
    setEnabled: function fakeSetEnabled(bool) {
      var self = this;
      var request = { result: bool };

      setTimeout(function() {
        if (request.onsuccess) {
          request.onsuccess();
        }
        if (bool) {
          self.onenabled();
        } else {
          self.ondisabled();
        }
      }, 0);

      self.enabled = bool;
      return request;
    },

    // returns a list of visible networks
    getNetworks: function() {
      var request = { result: fakeNetworks };

      setTimeout(function() {
        if (request.onsuccess)
          request.onsuccess();
      }, 2000);

      return request;
    },

    // selects a network
    associate: function(network) {
      var self = this;
      var connection = { result: network };
      var networkEvent = { network: network };

      setTimeout(function() {
        self.connection.status = 'connecting';
        self.onstatuschange(networkEvent);
      }, 0);

      setTimeout(function() {
        self.connection.status = 'associated';
        self.onstatuschange(networkEvent);
      }, 1000);

      setTimeout(function() {
        network.connected = true;
        self.connected = network;
        self.connection.network = network;
        self.connection.status = 'connected';
        self.onstatuschange(networkEvent);
      }, 2000);

      return connection;
    },

    // event listeners
    onenabled: function(event) {},
    ondisabled: function(event) {},
    onstatuschange: function(event) {},

    // returns a network object for the currently connected network (if any)
    connected: null,

    connection: {
      status: 'disconnected',
      network: null
    }
  };
})(this);

// handle Wi-Fi settings
window.addEventListener('localized', function wifiSettings(evt) {
  var _ = navigator.mozL10n.get;

  // main wifi button
  var gStatus = (function wifiStatus(checkbox, infoBlock) {
    var switching = false;

    // current state
    function updateState() {
      switching = false;
      var currentNetwork = gWifiManager.connection.network;
      if (currentNetwork) {
        infoBlock.textContent = _('fullStatus-connected', currentNetwork);
        checkbox.checked = true;
      } else if (gWifiManager.enabled) {
        infoBlock.textContent = _('fullStatus-disconnected');
        checkbox.checked = true;
      } else {
        infoBlock.textContent = _('disabled');
        checkbox.checked = false;
      }
    }

    // toggle wifi on/off
    checkbox.onchange = function toggleWifi() {
      if (switching)
        return;
      switching = true;
      var req;
      if (gWifiManager.enabled) {
        // stop wifi
        gNetworkList.clear();
        infoBlock.textContent = '';
        req = gWifiManager.setEnabled(false);
      } else {
        // start wifi
        req = gWifiManager.setEnabled(true);
        req.onerror = function() {
          gNetworkList.autoscan = false;
        };
      }
    };

    // API
    return {
      get textContent() { return infoBlock.textContent; },
      set textContent(value) { infoBlock.textContent = value; },
      get switching() { return switching; },
      update: updateState
    };
  }) (document.querySelector('#wifi-enabled input[type=checkbox]'),
      document.querySelector('#wifi-desc'));

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
    function clear(addScanningItem) {
      while (list.hasChildNodes())
        list.removeChild(list.lastChild);
      if (addScanningItem)
        list.appendChild(newScanItem());
      index = [];
    };

    // scan wifi networks and display them in the list
    function scan() {
      if (scanning)
        return;

      // stop auto-scanning if wifi disabled or the app is hidden
      if (!gWifiManager.enabled || document.mozHidden) {
        scanning = false;
        return;
      }

      var req = gWifiManager.getNetworks();
      scanning = true;

      req.onsuccess = function() {
        scanning = false;
        var networks = req.result;

        // sort networks: connected network first, then by signal strength
        var ssids = Object.getOwnPropertyNames(networks);
        ssids.sort(function(a, b) {
          return isConnected(networks[b]) ? 100 :
              networks[b].relSignalStrength - networks[a].relSignalStrength;
        });

        // create list
        clear();
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
          clear(true);
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
        console.warn('wifi error: ' + req.error.name);
        gStatus.textContent = req.error.name;

        // auto-rescan if requested
        if (autoscan)
          window.setTimeout(scan, scanRate);
      };

      gStatus.update();
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

  // auto-scan networks if the wifi panel is active
  window.addEventListener('hashchange', function autoscan() {
    if (document.location.hash == '#wifi') {
      gNetworkList.autoscan = false; // disabled, as requested by UX
      gNetworkList.scan();
    } else {
      gNetworkList.autoscan = false;
    }
  });

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
  gWifiManager.onstatuschange = function(event) {
    if (!gWifiManager.connection || !gWifiManager.connection.network)
      return;
    var ssid = gWifiManager.connection.network.ssid;
    var status = gWifiManager.connection.status;
    if (status == 'connected')
      gNetworkList.scan(); // refresh the network list
    // 'fullStatus' can use 'ssid' as an argument, 'shortStatus' cannot
    gStatus.textContent = _('fullStatus-' + status, event.network);
    gNetworkList.display(ssid, _('shortStatus-' + status));
  };

  /** mozWifiManager events / callbacks
    * requires bug 766497
    */
  gWifiManager.onenabled = function onWifiEnabled() {
    gStatus.update();
    gNetworkList.clear(true);
    gNetworkList.scan();
  }
  gWifiManager.ondisabled = function onWifiDisabled() {
    gStatus.update();
  }

  function isConnected(network) {
    // XXX the API should expose a 'connected' property on 'network',
    // and 'gWifiManager.connection.network' should be comparable to 'network'.
    // Until this is properly implemented, we just compare SSIDs to tell wether
    // the network is already connected or not.
    var currentNetwork = gWifiManager.connection.network;
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
      switch (key) {
        case 'WEP':
        case 'WPA-PSK':
        case 'WPA-EAP':
          wifiDialog('#wifi-auth', wifiConnect, key);
          break;
        default:
          wifiConnect();
      }
    }

    function wifiConnect() {
      gWifiManager.associate(network);
      gStatus.textContent = '';
      gNetworkList.display(network.ssid, _('shortStatus-disconnected'));
    }

    function wifiDisconnect() {
      gWifiManager.forget(network);
      gNetworkList.display(network.ssid, _('shortStatus-disconnected'));
      gStatus.textContent = '';
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

    function setPassword(password, identity) {
      var key = getKeyManagement();
      if (key == 'WEP') {
        network.wep = password;
      } else if (key == 'WPA-PSK') {
        network.psk = password;
      } else if (key == 'WPA-EAP') {
        network.password = password;
        if (identity) {
          network.identity = identity;
        }
      }
      network.keyManagement = key;
    }

    // generic wifi property dialog
    // TODO: the 'OK' button should be disabled until the password string
    //       has a suitable length (e.g. 8..63)
    function wifiDialog(selector, callback, key) {
      var dialog = document.querySelector(selector);
      if (!dialog || !network)
        return null;

      // network info
      var keys = network.capabilities;
      var sl = Math.min(Math.floor(network.relSignalStrength / 20), 4);
      dialog.querySelector('[data-ssid]').textContent = network.ssid;
      dialog.querySelector('[data-speed]').textContent = network.linkSpeed;
      dialog.querySelector('[data-signal]').textContent = _('signalLevel' + sl);
      dialog.querySelector('[data-security]').textContent =
          (keys && keys.length) ? keys.join(', ') : _('securityNone');

      // authentication fields
      if (key) {
        var identity = dialog.querySelector('input[name=identity]');
        identity.value = network.identity || '';

        var password = dialog.querySelector('input[name=password]');
        password.type = 'password';
        password.value = network.password || '';

        var showPassword = dialog.querySelector('input[name=show-pwd]');
        showPassword.checked = false;
        showPassword.onchange = function() {
          password.type = this.checked ? 'text' : 'password';
        };

        // XXX hack: hide the footer (which contains the 'OK' button...)
        //           when the virtual keyboard is shown
        var footer = dialog.querySelector('footer');
        var inputs = dialog.querySelectorAll('[type=text], [type=password]');
        for (var i = 0; i < inputs.length; i++) {
          inputs[i].onfocus = function hideFooter() {
            footer.style.display = 'none';
          };
          inputs[i].onblur = function showFooter() {
            footer.style.display = 'block';
          };
        }
      }

      // hide dialog box
      function close() {
        // reset identity/password fields
        if (key) {
          identity.value = '';
          password.value = '';
          showPassword.checked = false;
        }
        // 'close' (hide) the dialog
        dialog.removeAttribute('class');
      }

      // OK|Cancel buttons
      var okButton = dialog.querySelector('[type=submit]');
      okButton.onclick = function() {
        if (key) {
          setPassword(password.value, identity.value);
        }
        close();
        return callback ? callback() : false;
      };

      var cancelButton = dialog.querySelector('[type=reset]');
      cancelButton.onclick = function() {
        close();
        return;
      };

      // show dialog box
      dialog.className = 'active ' + key;
      return dialog;
    }
  }

  // startup
  gStatus.update();
  if (gWifiManager.enabled) {
    gNetworkList.clear(true);
    gNetworkList.scan();
  }
});

