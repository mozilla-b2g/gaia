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
    getNetworks: function fakeGetNetworks() {
      var request = { result: fakeNetworks };

      setTimeout(function() {
        if (request.onsuccess)
          request.onsuccess();
      }, 2000);

      return request;
    },

    // selects a network
    associate: function fakeAssociate(network) {
      var self = this;
      var connection = { result: network };
      var networkEvent = { network: network };

      setTimeout(function fakeConnecting() {
        self.connection.network = network;
        self.connection.status = 'connecting';
        self.onstatuschange(networkEvent);
      }, 0);

      setTimeout(function fakeAssociated() {
        self.connection.network = network;
        self.connection.status = 'associated';
        self.onstatuschange(networkEvent);
      }, 1000);

      setTimeout(function fakeConnected() {
        network.connected = true;
        self.connected = network;
        self.connection.network = network;
        self.connection.status = 'connected';
        self.onstatuschange(networkEvent);
      }, 2000);

      return connection;
    },

    // forgets a network (disconnect)
    forget: function fakeForget(network) {
      var self = this;
      var networkEvent = { network: network };

      setTimeout(function() {
        network.connected = false;
        self.connected = null;
        self.connection.network = null;
        self.connection.status = 'disconnected';
        self.onstatuschange(networkEvent);
      }, 0);
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
  var settings = window.navigator.mozSettings;
  var _ = navigator.mozL10n.get;

  var gWifiCheckBox =
    document.querySelector('#wifi-enabled input[type=checkbox]');
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
  gWifiManager.onstatuschange = function(event) {
    // update network status only if wifi is enabled.
    if (gWifiManager.enabled) {
      updateNetworkState();

      // refresh the network list when network is connected.
      if (event.status == 'connected') {
        gNetworkList.scan();
      }
    }
  };

  gWifiManager.onenabled = function onWifiEnabled() {
    updateNetworkState(); // update wifi state
    gNetworkList.scan();
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
      };
      return li;
    }

    // clear the network list
    function clear(addScanningItem) {
      while (list.hasChildNodes())
        list.removeChild(list.lastChild);
      if (addScanningItem)
        list.appendChild(newScanItem());
      index = [];
    }

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

      req.onsuccess = function onScanSuccess() {
        scanning = false;

        // clear list again for showing scaning result.
        clear(false);
        var button = document.createElement('button');
        button.textContent = _('scanNetworks');
        button.onclick = function() {
          clear(true);
          scan();
        };
        var scanItem = document.createElement('li');
        scanItem.appendChild(button);
        list.appendChild(scanItem);

        // sort networks by signal strength
        var networks = req.result;
        var ssids = Object.getOwnPropertyNames(networks);
        ssids.sort(function(a, b) {
          return networks[b].relSignalStrength - networks[a].relSignalStrength;
        });

        // add detected networks
        for (var i = 0; i < ssids.length; i++) {
          var network = networks[ssids[i]];
          var listItem = newListItem(network);
          // put connected network on top of list
          if (isConnected(network)) {
            listItem.className = 'active';
            listItem.querySelector('small').textContent =
                _('shortStatus-connected');
            list.insertBefore(listItem, list.firstChild);
          } else {
            list.insertBefore(listItem, scanItem);
          }
          index[network.ssid] = listItem; // add to index
        }

        // auto-rescan if requested
        if (autoscan)
          window.setTimeout(scan, scanRate);
      };

      req.onerror = function onScanError(error) {
        scanning = false;
        clear(false);

        // auto-rescan if requested
        if (autoscan)
          window.setTimeout(scan, scanRate);
      };

    }

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
    } else if (network.password && (network.password == '*')) {
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
      gNetworkList.display(network.ssid, _('shortStatus-connecting'));
    }

    function wifiDisconnect() {
      gWifiManager.forget(network);
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
        // reset authentication fields
        if (key) {
          identity.value = '';
          password.value = '';
          showPassword.checked = false;
        }
        // 'close' (hide) the dialog
        dialog.removeAttribute('class');
        return false; // ignore <form> action
      }

      // OK|Cancel buttons
      dialog.onreset = close;
      dialog.onsubmit = function() {
        if (key) {
          setPassword(password.value, identity.value);
        }
        if (callback) {
          callback();
        }
        return close();
      };

      // show dialog box
      dialog.className = 'active ' + key;
      return dialog;
    }
  }

  // current network state
  function updateNetworkState() {
    var currentNetwork = gWifiManager.connection.network;
    var networkStatus = gWifiManager.connection.status;
    //XXX: we need a 'initializing' state, use 'offline' here.
    if (!gWifiManager.enabled) {
        gWifiInfoBlock.textContent = _('fullStatus-disconnected');
    } else {
      if (networkStatus === 'associated' || networkStatus === 'connecting') {
        gWifiInfoBlock.textContent = _('fullStatus-connecting', currentNetwork);
      } else if (networkStatus === 'connected') {
        gWifiInfoBlock.textContent = _('fullStatus-connected', currentNetwork);
      } else {
        gWifiInfoBlock.textContent = _('fullStatus-disconnected');
      }
    }
  }

  function setWifiEnabled(val) {
    gWifiCheckBox.checked = val;
    if (val) {
      updateNetworkState(); // update wifi state
      gNetworkList.clear(true);
      gNetworkList.scan();
    } else {
      gWifiInfoBlock.textContent = _('disabled');
      gNetworkList.clear(false);
      gNetworkList.autoscan = false;
    }
  }

  if (settings) {
    // register an observer to monitor wifi.enabled changes
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

