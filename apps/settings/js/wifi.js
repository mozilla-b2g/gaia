/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// handle Wi-Fi settings
navigator.mozL10n.ready(function wifiSettings() {
  var _ = navigator.mozL10n.get;

  var settings = window.navigator.mozSettings;
  if (!settings)
    return;

  var gWifiManager = WifiHelper.getWifiManager();
  var gWifi = document.querySelector('#wifi');
  var gWifiCheckBox = document.querySelector('#wifi-enabled input');
  var gWifiInfoBlock = document.querySelector('#wifi-desc');
  var gWpsInfoBlock = document.querySelector('#wps-column small');
  var gWpsPbcLabelBlock = document.querySelector('#wps-column a');

  var gCurrentNetwork = gWifiManager.connection.network;

  // auto-scan networks when the Wi-Fi panel gets visible
  var gScanPending = false;
  var gWifiSectionVisible = false;

  function updateVisibilityStatus() {
    var computedStyle = window.getComputedStyle(gWifi);
    gWifiSectionVisible = (!document.mozHidden &&
                           computedStyle.visibility != 'hidden');
    if (gWifiSectionVisible && gScanPending) {
      gNetworkList.scan();
      gScanPending = false;
    }
  }

  document.addEventListener('mozvisibilitychange', updateVisibilityStatus);
  gWifi.addEventListener('transitionend', function(evt) {
    if (evt.target == gWifi) {
      updateVisibilityStatus();
    }
  });

  // toggle wifi on/off
  gWifiCheckBox.onchange = function toggleWifi() {
    settings.createLock().set({
      'wifi.enabled': this.checked,
      'wifi.suspended': !this.checked
    }).onerror = function() {
      // Fail to write mozSettings, return toggle control to the user.
      gWifiCheckBox.disabled = false;
    };
    this.disabled = true;
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

  var gScanStates = new Set(['connected', 'connectingfailed', 'disconnected']);
  Connectivity.wifiStatusChange = function(event) {
    updateNetworkState();

    if (gScanStates.has(event.status)) {
      if (gWifiSectionVisible) {
        gNetworkList.scan();
      } else {
        gScanPending = true;
      }
    }
  };

  Connectivity.wifiEnabled = function onWifiEnabled() {
    // Re-enable UI toggle
    gWifiCheckBox.disabled = false;
    updateNetworkState();
    gNetworkList.scan();
  };

  Connectivity.wifiDisabled = function onWifiDisabled() {
    // Re-enable UI toggle
    gWifiCheckBox.disabled = false;
    gWifiInfoBlock.textContent = _('disabled');
    gWifiInfoBlock.dataset.l10nId = 'disabled';
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
        gWpsPbcLabelBlock.dataset.l10nId = 'wpsMessage';
        gWpsInfoBlock.textContent = _('fullStatus-wps-canceled');
        gWpsInfoBlock.dataset.l10nId = 'fullStatus-wps-canceled';
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
        gWpsPbcLabelBlock.dataset.l10nId = 'wpsCancelMessage';
        gWpsInfoBlock.textContent = _('fullStatus-wps-inprogress');
        gWpsInfoBlock.dataset.l10nId = 'fullStatus-wps-inprogress';
      };
      req.onerror = function() {
        gWpsInfoBlock.textContent = _('fullStatus-wps-failed') +
          ' [' + req.error.name + ']';
      };
    }

    function wpsDialog(dialogID, callback) {
      var dialog = document.getElementById(dialogID);
      if (!dialog)
        return;

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
      pinInput.oninput = function() {
        submitWpsButton.disabled = !isValidWpsPin(pinInput.value);
      };

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
      ssid.classList.add('wifi-secure');
    } else {
      small.textContent = _('securityOpen');
      small.dataset.l10nId = 'securityOpen';
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

  // create an explanatory list item
  function newExplanationItem(message) {
    var li = document.createElement('li');
    li.className = 'explanation';
    li.textContent = _(message);
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
        var allNetworks = req.result;
        var networks = {};
        for (var i = 0; i < allNetworks.length; ++i) {
          var network = allNetworks[i];
          // use ssid + capabilities as a composited key
          var key = network.ssid + '+' + network.capabilities.join('+');
          // keep connected network first, or select the highest strength
          if (!networks[key] || network.connected) {
            networks[key] = network;
          } else {
            if (!networks[key].connected &&
                network.relSignalStrength > networks[key].relSignalStrength)
              networks[key] = network;
          }
        }

        var networkKeys = Object.getOwnPropertyNames(networks);
        clear(false);

        // display network list
        if (networkKeys.length) {
          // sort networks by signal strength
          networkKeys.sort(function(a, b) {
            return networks[b].relSignalStrength -
                networks[a].relSignalStrength;
          });

          // add detected networks
          for (var i = 0; i < networkKeys.length; i++) {
            var network = networks[networkKeys[i]];
            var listItem = newListItem(network, toggleNetwork);

            // signal is between 0 and 100, level should be between 0 and 4
            var level = Math.min(Math.floor(network.relSignalStrength / 20), 4);
            listItem.querySelector('a').classList.add('wifi-signal' + level);

            // put connected network on top of list
            if (isConnected(network)) {
              listItem.classList.add('active');
              listItem.querySelector('small').textContent =
                  _('shortStatus-connected');
              list.insertBefore(listItem, infoItem.nextSibling);
            } else {
              list.insertBefore(listItem, scanItem);
            }
            index[networkKeys[i]] = listItem; // add composited key to index
          }
        } else {
          // display a "no networks found" message if necessary
          list.insertBefore(newExplanationItem('noNetworksFound'), scanItem);
        }

        // display the "Search Again" button
        list.dataset.state = 'ready';

        PerformanceTestingHelper.dispatch('settings-panel-wifi-ready');

        // auto-rescan if requested
        if (autoscan) {
          window.setTimeout(scan, scanRate);
        }

        scanning = false;
      };

      req.onerror = function onScanError(error) {
        // always try again.
        scanning = false;

        PerformanceTestingHelper.dispatch('settings-panel-wifi-ready');

        window.setTimeout(scan, scanRate);
      };
    }

    // display a message on the network item matching the ssid
    function display(network, message) {
      var key = network.ssid + '+' + network.capabilities.join('+');
      var listItem = index[key];
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

  // saved network list
  var gKnownNetworkList = (function knownNetworkList(list) {
    // clear the network list
    function clear() {
      while (list.hasChildNodes()) {
        list.removeChild(list.lastChild);
      }
    }

    // propose to forget a network
    function forgetNetwork(network) {
      var dialog = document.querySelector('#wifi-manageNetworks form');
      dialog.hidden = false;
      dialog.onsubmit = function forget() {
        gWifiManager.forget(network);
        scan();
        dialog.hidden = true;
        return false;
      };
      dialog.onreset = function cancel() {
        dialog.hidden = true;
        return false;
      };
    }

    // list known networks
    function scan() {
      var req = gWifiManager.getKnownNetworks();

      req.onsuccess = function onSuccess() {
        var allNetworks = req.result;
        var networks = {};
        for (var i = 0; i < allNetworks.length; ++i) {
          var network = allNetworks[i];
          // use ssid + capabilities as a composited key
          var key = network.ssid + '+' + network.capabilities.join('+');
          networks[key] = network;
        }
        var networkKeys = Object.getOwnPropertyNames(networks);
        clear();

        // display network list
        if (networkKeys.length) {
          networkKeys.sort();
          for (var i = 0; i < networkKeys.length; i++) {
            var aItem = newListItem(networks[networkKeys[i]], forgetNetwork);
            list.appendChild(aItem);
          }
        } else {
          // display a "no known networks" message if necessary
          list.appendChild(newExplanationItem('noKnownNetworks'));
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

  // join hidden network
  document.getElementById('joinHidden').onclick = function joinHiddenNetwork() {
    toggleNetwork();
  };

  function isConnected(network) {
    /**
     * XXX the API should expose a 'connected' property on 'network',
     * and 'gWifiManager.connection.network' should be comparable to 'network'.
     * Until this is properly implemented, we just compare SSIDs to tell wether
     * the network is already connected or not.
     */
    var currentNetwork = gWifiManager.connection.network;
    if (!currentNetwork)
      return false;
    var key = network.ssid + '+' + network.capabilities.join('+');
    var curkey = currentNetwork.ssid + '+' +
        currentNetwork.capabilities.join('+');
    return (key == curkey);
  }

  // UI to connect/disconnect
  function toggleNetwork(network) {
    if (!network) {
      // offline, hidden SSID
      network = {};
      wifiDialog('wifi-joinHidden', wifiConnect);
    } else if (isConnected(network)) {
      // online: show status + offer to disconnect
      wifiDialog('wifi-status', wifiDisconnect);
    } else if (network.password && (network.password == '*')) {
      // offline, known network (hence the '*' password value):
      // no further authentication required.
      setPassword();
      wifiConnect();
    } else {
      // offline, unknown network: propose to connect
      var key = WifiHelper.getKeyManagement(network);
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
      settings.createLock().set({'wifi.connect_via_settings': true});
      gNetworkList.display(network, _('shortStatus-connecting'));
    }

    function wifiDisconnect() {
      settings.createLock().set({'wifi.connect_via_settings': false});
      gWifiManager.forget(network);
      gNetworkList.display(network, _('shortStatus-disconnected'));
      // get available network list
      gNetworkList.scan();
      gCurrentNetwork = null;
    }

    function setPassword(password, identity) {
      var key = WifiHelper.getKeyManagement(network);
      if (key == 'WEP') {
        network.wep = password;
      } else if (key == 'WPA-PSK') {
        network.psk = password;
      } else if (key == 'WPA-EAP') {
        network.password = password;
        if (identity && identity.length) {
          network.identity = identity;
        }
      }
      network.keyManagement = key;
    }

    // generic wifi property dialog
    function wifiDialog(dialogID, callback, key) {
      var dialog = document.getElementById(dialogID);

      // authentication fields
      var identity, password, showPassword;
      if (dialogID != 'wifi-status') {
        identity = dialog.querySelector('input[name=identity]');
        identity.value = network.identity || '';

        password = dialog.querySelector('input[name=password]');
        password.type = 'password';
        password.value = network.password || '';

        showPassword = dialog.querySelector('input[name=show-pwd]');
        showPassword.checked = false;
        showPassword.onchange = function() {
          password.type = this.checked ? 'text' : 'password';
        };
      }

      if (dialogID === 'wifi-joinHidden') {
        network.hidden = true;
      }

      // disable the "OK" button if the password is too short
      if (password) {
        var checkPassword = function checkPassword() {
          var disabled = false;
          switch (key) {
            case 'WPA-PSK':
              disabled = disabled || (password && password.value.length < 8);
              break;
            case 'WPA-EAP':
              disabled = disabled || (identity && identity.value.length < 1);
            case 'WEP':
              disabled = disabled || (password && password.value.length < 1);
              break;
          }
          dialog.querySelector('button[type=submit]').disabled = disabled;
        };
        password.oninput = checkPassword;
        identity.oninput = checkPassword;
        checkPassword();
      }

      // initialisation
      switch (dialogID) {
        case 'wifi-status':
          // we're connected, let's display some connection info
          var ipAddress = dialog.querySelector('[data-ip]'); // IP address
          var speed = dialog.querySelector('[data-speed]'); // link speed
          var updateNetInfo = function() {
            var info = gWifiManager.connectionInformation;
            ipAddress.textContent = info.ipAddress || '';
            speed.textContent =
                _('linkSpeedMbs', { linkSpeed: info.linkSpeed });
          };
          gWifiManager.connectionInfoUpdate = updateNetInfo;
          updateNetInfo();

        case 'wifi-auth':
          // network info -- #wifi-status and #wifi-auth
          var keys = network.capabilities;
          var security = (keys && keys.length) ? keys.join(', ') : '';
          var sl = Math.min(Math.floor(network.relSignalStrength / 20), 4);
          dialog.querySelector('[data-ssid]').textContent = network.ssid;
          dialog.querySelector('[data-signal]').textContent =
              _('signalLevel' + sl);
          dialog.querySelector('[data-security]').textContent =
              security || _('securityNone');
          dialog.dataset.security = security;
          break;

        case 'wifi-joinHidden':
          var security = dialog.querySelector('select');
          var onSecurityChange = function() {
            key = security.selectedIndex ? security.value : '';
            network.capabilities = [key];
            dialog.dataset.security = key;
            checkPassword();
          };
          security.onchange = onSecurityChange;
          onSecurityChange();
          break;
      }

      // reset dialog box
      function reset() {
        if (speed) {
          gWifiManager.connectionInfoUpdate = null;
        }
        if (dialogID != 'wifi-status') {
          identity.value = '';
          password.value = '';
          showPassword.checked = false;
        }
      }

      // OK|Cancel buttons
      function submit() {
        if (dialogID === 'wifi-joinHidden') {
          network.ssid = dialog.querySelector('input[name=ssid]').value;
        }
        if (key) {
          setPassword(password.value, identity.value);
        }
        if (callback) {
          callback();
          if (dialogID === 'wifi-joinHidden') {
            gKnownNetworkList.scan();
          }
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

    if (networkStatus === 'connectingfailed' && gCurrentNetwork) {
      settings.createLock().set({'wifi.connect_via_settings': false});
      // connection has failed, probably an authentication issue...
      delete(gCurrentNetwork.password);
      gWifiManager.forget(gCurrentNetwork); // force a new authentication dialog
      gNetworkList.display(gCurrentNetwork,
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
        gWpsPbcLabelBlock.dataset.l10nId = 'wpsMessage';
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
      document.querySelector('#wps-column').hidden = false;
    } else {
      gWifiInfoBlock.textContent = _('disabled');
      if (gWpsInProgress) {
        gWpsInfoBlock.textContent = gWifiInfoBlock.textContent;
      }
      gNetworkList.clear(false);
      gNetworkList.autoscan = false;
      document.querySelector('#wps-column').hidden = true;
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

