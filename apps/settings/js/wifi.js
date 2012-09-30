/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
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

  /**
   * fake network list, where each network object looks like:
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
  var _ = navigator.mozL10n.get;

  var settings = window.navigator.mozSettings;
  if (!settings)
    return;

  var gWifiCheckBox = document.querySelector('#wifi-enabled input');
  var gWifiInfoBlock = document.querySelector('#wifi-desc');
  var gWpsInfoBlock = document.querySelector('#wps-column small');
  var gWpsPbcLabelBlock = document.querySelector('#wps-column a');

  var gCurrentNetwork = gWifiManager.connection.network;

  // toggle wifi on/off
  gWifiCheckBox.onchange = function toggleWifi() {
    settings.createLock().set({'wifi.enabled': this.checked});
  };

  /**
   * mozWifiManager status
   * see dom/wifi/nsIWifi.idl -- the 4 possible statuses are:
   *  - connecting:
   *        fires when we start the process of connecting to a network.
   *  - associated:
   *        fires when we have connected to an access point but do not yet
   *        have an IP address.
   *  - connected:
   *        fires once we are fully connected to an access point.
   *  - connectingfailed:
   *        fires when we fail to connect to an access point.
   *  - disconnected:
   *        fires when we were connected to a network but have been
   *        disconnected.
   */

  gWifiManager.onstatuschange = function(event) {
    updateNetworkState();

    // refresh the network list when network is connected.
    if (event.status === 'connected') {
      gNetworkList.scan();
    }
  };

  gWifiManager.onenabled = function onWifiEnabled() {
    updateNetworkState();
    gNetworkList.scan();
  };

  gWifiManager.ondisabled = function onWifiDisabled() {
    gWifiInfoBlock.textContent = _('disabled');
    gNetworkList.clear(false);
    gNetworkList.autoscan = false;
  };

  // Wi-Fi Protected Setup
  var gWpsInProgress = false;
  document.getElementById('wps-column').onclick = function() {
    if (gWpsInProgress) {
      var req = gWifiManager.wps({
        method: 'cancel'
      });
      req.onsuccess = function() {
        gWpsInProgress = false;
        gWpsPbcLabelBlock.textContent = _('wpsMessage');
        gWpsInfoBlock.textContent = _('fullStatus-wps-canceled');
      };
      req.onerror = function() {
        gWpsInfoBlock.textContent = _('wpsCancelFailedMessage') +
          ' [' + req.error.name + ']';
      };
    } else {
      wpsDialog('wifi-wps', wpsCallback);
    }

    function wpsCallback(method, pin) {
      var req;
      if (method === 'pbc') {
        req = gWifiManager.wps({
          method: 'pbc'
        });
      } else if (method === 'myPin') {
        req = gWifiManager.wps({
          method: 'pin'
        });
      } else {
        req = gWifiManager.wps({
          method: 'pin',
          pin: pin
        });
      }
      req.onsuccess = function() {
        if (method === 'myPin') {
          alert(_('wpsPinInput', { pin: req.result }));
        }
        gWpsInProgress = true;
        gWpsPbcLabelBlock.textContent = _('wpsCancelMessage');
        gWpsInfoBlock.textContent = _('fullStatus-wps-inprogress');
      };
      req.onerror = function() {
        gWpsInfoBlock.textContent = _('fullStatus-wps-failed') +
          ' [' + req.error.name + ']';
      };
    }

    function wpsDialog(dialogID, callback) {
      var dialog = document.getElementById(dialogID);
      if (!dialog)
        return null;

      // hide dialog box
      function pinChecksum(pin) {
        var accum = 0;
        while (pin > 0) {
          accum += 3 * (pin % 10);
          pin = Math.floor(pin / 10);
          accum += pin % 10;
          pin = Math.floor(pin / 10);
        }
        return (10 - accum % 10) % 10;
      }

      function isValidWpsPin(pin) {
        if (pin.match(/[^0-9]+/))
          return false;
        if (pin.length === 4)
          return true;
        if (pin.length !== 8)
          return false;
        var num = pin - 0;
        return pinChecksum(Math.floor(num / 10)) === (num % 10);
      }

      var submitWpsButton = dialog.querySelector('button[type=submit]');
      var pinItem = document.getElementById('wifi-wps-pin-area');
      var pinDesc = pinItem.querySelector('p');
      var pinInput = pinItem.querySelector('input');
      pinInput.onchange = function() {
        submitWpsButton.disabled = !isValidWpsPin(pinInput.value);
      }

      function onWpsMethodChange() {
        var method =
          dialog.querySelector("input[type='radio']:checked").value;
        if (method === 'apPin') {
          submitWpsButton.disabled = !isValidWpsPin(pinInput.value);
          pinItem.hidden = false;
        } else {
          submitWpsButton.disabled = false;
          pinItem.hidden = true;
        }
      }

      var radios = dialog.querySelectorAll('input[type="radio"]');
      for (var i = 0; i < radios.length; i++) {
        radios[i].onchange = onWpsMethodChange;
      }
      onWpsMethodChange();

      openDialog(dialogID, function submit() {
        callback(dialog.querySelector("input[type='radio']:checked").value,
          pinInput.value);
      });
    }
  };

  // create a network list item
  function newListItem(network, callback) {
    /**
     * A Wi-Fi list item has the following HTML structure:
     *   <li>
     *     <small> Network Security </small>
     *     <a [class="wifi-secure"]> Network SSID </a>
     *   </li>
     */

    // ssid
    var ssid = document.createElement('a');
    ssid.textContent = network.ssid;

    // supported authentication methods
    var small = document.createElement('small');
    var keys = network.capabilities;
    if (keys && keys.length) {
      small.textContent = _('securedBy', { capabilities: keys.join(', ') });
      ssid.className = 'wifi-secure';
    } else {
      small.textContent = _('securityOpen');
    }

    // create list item
    var li = document.createElement('li');
    li.appendChild(small);
    li.appendChild(ssid);

    // bind connection callback
    li.onclick = function() {
      callback(network);
    };
    return li;
  }

  // available network list
  var gNetworkList = (function networkList(list) {
    var scanning = false;
    var autoscan = false;
    var scanRate = 5000; // 5s after last scan results
    var index = [];      // index of all scanned networks

    // get the "Searching..." and "Search Again" items, respectively
    var infoItem = list.querySelector('li[data-state="on"]');
    var scanItem = list.querySelector('li[data-state="ready"]');
    scanItem.onclick = function() {
      clear(true);
      scan();
    };

    // clear the network list
    function clear(addScanningItem) {
      index = [];

      // remove all items except the text expl. and the "search again" button
      var wifiItems = list.querySelectorAll('li:not([data-state])');
      var len = wifiItems.length;
      for (var i = len - 1; i >= 0; i--) {
        list.removeChild(wifiItems[i]);
      }

      list.dataset.state = addScanningItem ? 'on' : 'off';
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

      scanning = true;
      var req = gWifiManager.getNetworks();

      req.onsuccess = function onScanSuccess() {
        clear(false);

        // sort networks by signal strength
        var networks = req.result;
        var ssids = Object.getOwnPropertyNames(networks);
        ssids.sort(function(a, b) {
          return networks[b].relSignalStrength - networks[a].relSignalStrength;
        });

        // add detected networks
        for (var i = 0; i < ssids.length; i++) {
          var network = networks[ssids[i]];
          var listItem = newListItem(network, toggleNetwork);

          // signal is between 0 and 100, level should be between 0 and 4
          var level = Math.min(Math.floor(network.relSignalStrength / 20), 4);
          listItem.className = 'wifi-signal' + level;

          // put connected network on top of list
          if (isConnected(network)) {
            listItem.classList.add('active');
            listItem.querySelector('small').textContent =
                _('shortStatus-connected');
            list.insertBefore(listItem, infoItem.nextSibling);
          } else {
            list.insertBefore(listItem, scanItem);
          }
          index[network.ssid] = listItem; // add to index
        }

        // display the "Search Again" button
        list.dataset.state = 'ready';

        // auto-rescan if requested
        if (autoscan) {
          window.setTimeout(scan, scanRate);
        }

        scanning = false;
      };

      req.onerror = function onScanError(error) {
        // always try again.
        scanning = false;
        window.setTimeout(scan, scanRate);
      };
    }

    // display a message on the network item matching the ssid
    function display(ssid, message) {
      var listItem = index[ssid];
      var active = list.querySelector('.active');
      if (active && active != listItem) {
        active.classList.remove('active');
        active.querySelector('small').textContent =
            _('shortStatus-disconnected');
      }
      if (listItem) {
        listItem.classList.add('active');
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
  }) (document.getElementById('wifi-availableNetworks'));

  var gKnownNetworkList = (function knownNetworkList(list) {
    // clear the network list
    function clear() {
      while (list.hasChildNodes()) {
        list.removeChild(list.lastChild);
      }
    }

    // propose to forget a network
    function forgetNetwork(network) {
      if (window.confirm(_('forgetNetwork'))) {
        gWifiManager.forget(network);
        scan();
      }
    }

    // list known networks
    function scan() {
      var req = gWifiManager.getKnownNetworks();

      req.onsuccess = function onSuccess() {
        clear();

        // sort networks alphabetically
        var networks = req.result;
        var ssids = Object.getOwnPropertyNames(networks);
        ssids.sort();

        // display known networks
        for (var i = 0; i < ssids.length; i++) {
          list.appendChild(newListItem(networks[ssids[i]], forgetNetwork));
        }
      };

      req.onerror = function onScanError(error) {
        console.warn('wifi: could not retrieve any known network. ');
      };
    }

    // API
    return {
      clear: clear,
      scan: scan
    };
  }) (document.getElementById('wifi-knownNetworks'));

  document.getElementById('manageNetworks').onclick = function knownNetworks() {
    gKnownNetworkList.scan();
    openDialog('wifi-manageNetworks');
  };

  function isConnected(network) {
    /**
     * XXX the API should expose a 'connected' property on 'network',
     * and 'gWifiManager.connection.network' should be comparable to 'network'.
     * Until this is properly implemented, we just compare SSIDs to tell wether
     * the network is already connected or not.
     */
    var currentNetwork = gWifiManager.connection.network;
    return currentNetwork && (currentNetwork.ssid == network.ssid);
  }

  // UI to connect/disconnect
  function toggleNetwork(network) {
    if (isConnected(network)) {
      // online: show status + offer to disconnect
      wifiDialog('wifi-status', wifiDisconnect);
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
          wifiDialog('wifi-auth', wifiConnect, key);
          break;
        default:
          wifiConnect();
      }
    }

    function wifiConnect() {
      gCurrentNetwork = network;
      gWifiManager.associate(network);
      gNetworkList.display(network.ssid, _('shortStatus-connecting'));
    }

    function wifiDisconnect() {
      gWifiManager.forget(network);
      gNetworkList.display(network.ssid, _('shortStatus-disconnected'));
      // get available network list
      gNetworkList.scan();
      gCurrentNetwork = null;
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
    function wifiDialog(dialogID, callback, key) {
      var dialog = document.getElementById(dialogID);
      if (!network)
        return null;

      // network info
      var keys = network.capabilities;
      var sl = Math.min(Math.floor(network.relSignalStrength / 20), 4);
      dialog.querySelector('[data-ssid]').textContent = network.ssid;
      dialog.querySelector('[data-signal]').textContent = _('signalLevel' + sl);
      dialog.querySelector('[data-security]').textContent =
          (keys && keys.length) ? keys.join(', ') : _('securityNone');

      // additional connection info (when connected)
      var ipAddress = dialog.querySelector('[data-ip]'); // IP address
      var speed = dialog.querySelector('[data-speed]'); // link speed
      function updateNetInfo() {
        var info = gWifiManager.connectionInformation;
        ipAddress.textContent = info.ipAddress || '';
        speed.textContent = _('linkSpeedMbs', { linkSpeed: info.linkSpeed });
      }
      if (speed && ipAddress) {
        gWifiManager.connectionInfoUpdate = updateNetInfo;
        updateNetInfo();
      }

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

        var submitButton = dialog.querySelector('button[type=submit]');
        if (key === 'WPA-PSK') {
          password.onchange = function() {
            submitButton.disabled = password.value.length < 8;
          };
          password.onchange();
        } else {
          password.onchange = function() {};
          submitButton.disabled = false;
        }
      }

      // reset dialog box
      function reset() {
        if (speed) {
          gWifiManager.connectionInfoUpdate = null;
        }
        // reset authentication fields
        if (key) {
          identity.value = '';
          password.value = '';
          showPassword.checked = false;
        }
      }

      // OK|Cancel buttons
      function submit() {
        if (key) {
          setPassword(password.value, identity.value);
        }
        if (callback) {
          callback();
        }
        reset();
      };

      // show dialog box
      openDialog(dialogID, submit, reset);
    }
  }

  // update network state, called only when wifi enabled.
  function updateNetworkState() {
    var networkStatus = gWifiManager.connection.status;

    // networkStatus has one of the following values:
    // connecting, associated, connected, connectingfailed, disconnected.
    gWifiInfoBlock.textContent =
        _('fullStatus-' + networkStatus, gWifiManager.connection.network);

    if (networkStatus === 'connectingfailed') {
      // connection has failed, probably an authentication issue...
      delete(gCurrentNetwork.password); // force a new authentication dialog
      gNetworkList.display(gCurrentNetwork.ssid,
          _('shortStatus-connectingfailed'));
      gCurrentNetwork = null;
    }

    if (gWpsInProgress) {
      if (networkStatus !== 'disconnected') {
        gWpsInfoBlock.textContent = gWifiInfoBlock.textContent;
      }
      if (networkStatus === 'connected' ||
          networkStatus === 'wps-timedout' ||
          networkStatus === 'wps-failed' ||
          networkStatus === 'wps-overlapped') {
        gWpsInProgress = false;
        gWpsPbcLabelBlock.textContent = _('wpsMessage');
      }
    }
  }

  function setMozSettingsEnabled(value) {
    gWifiCheckBox.checked = value;
    if (value) {
      /**
       * gWifiManager may not be ready (enabled) at this moment.
       * To be responsive, show 'initializing' status and 'search...' first.
       * A 'scan' would be called when gWifiManager is enabled.
       */
      gWifiInfoBlock.textContent = _('fullStatus-initializing');
      gNetworkList.clear(true);
      document.querySelector('#macAddress small').textContent =
        gWifiManager.macAddress;
      document.querySelector('[data-l10n-id="macAddress"] span').textContent =
        gWifiManager.macAddress; // XXX should be stored in a setting
    } else {
      gWifiInfoBlock.textContent = _('disabled');
      if (gWpsInProgress) {
        gWpsInfoBlock.textContent = gWifiInfoBlock.textContent;
      }
      gNetworkList.clear(false);
      gNetworkList.autoscan = false;
    }
  }

  var lastMozSettingValue = true;

  // register an observer to monitor wifi.enabled changes
  settings.addObserver('wifi.enabled', function(event) {
    if (lastMozSettingValue == event.settingValue)
      return;

    lastMozSettingValue = event.settingValue;
    setMozSettingsEnabled(event.settingValue);
  });

  // startup, update status
  var req = settings.createLock().get('wifi.enabled');
  req.onsuccess = function wf_getStatusSuccess() {
    lastMozSettingValue = req.result['wifi.enabled'];
    setMozSettingsEnabled(lastMozSettingValue);
    if (lastMozSettingValue) {
      /**
       * At this moment, gWifiManager has probably been enabled.
       * This means it won't invoke any status changed callback function;
       * therefore, we have to get network list here.
       */
      updateNetworkState();
      gNetworkList.scan();
    }
  };
});

