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
    gWifiSectionVisible = (!document.hidden &&
                           computedStyle.visibility != 'hidden');
    if (gWifiSectionVisible && gScanPending) {
      gNetworkList.scan();
      gScanPending = false;
    }
  }

  document.addEventListener('visibilitychange', updateVisibilityStatus);
  gWifi.addEventListener('transitionend', function(evt) {
    if (evt.target == gWifi) {
      updateVisibilityStatus();
    }
  });

  // toggle wifi on/off
  gWifiCheckBox.onchange = function toggleWifi() {
    settings.createLock().set({
      'wifi.enabled': this.checked
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

  function wpsStatusReset() {
    // The WPS process is done (connected, cancelled or error):
    //  - reset the title of the WPS item ("Connect with WPS") right now;
    //  - leave the current status for a moment, then reset it to the default
    //    message ("Automatic Wi-Fi setup").
    localize(gWpsPbcLabelBlock, 'wpsMessage');
    setTimeout(function resetWpsInfoBlock() {
      localize(gWpsInfoBlock, 'wpsDescription2');
    }, 1500);
  }

  document.getElementById('wps-column').onclick = function() {
    if (gWpsInProgress) {
      var req = gWifiManager.wps({
        method: 'cancel'
      });
      req.onsuccess = function() {
        gWpsInProgress = false;
        localize(gWpsInfoBlock, 'fullStatus-wps-canceled');
        wpsStatusReset();
      };
      req.onerror = function() {
        gWpsInfoBlock.textContent = _('wpsCancelFailedMessage') +
          ' [' + req.error.name + ']';
      };
    } else {
      wpsDialog('wifi-wps', wpsCallback);
    }

    function wpsCallback(bssid, method, pin) {
      var req;
      if (method === 'pbc') {
        req = gWifiManager.wps({
          method: 'pbc'
        });
      } else if (method === 'myPin') {
        req = gWifiManager.wps({
          method: 'pin',
          bssid: bssid
        });
      } else {
        req = gWifiManager.wps({
          method: 'pin',
          bssid: bssid,
          pin: pin
        });
      }
      req.onsuccess = function() {
        if (method === 'myPin') {
          alert(_('wpsPinInput', { pin: req.result }));
        }
        gWpsInProgress = true;
        localize(gWpsPbcLabelBlock, 'wpsCancelMessage');
        localize(gWpsInfoBlock, 'fullStatus-wps-inprogress');
      };
      req.onerror = function() {
        gWpsInfoBlock.textContent = _('fullStatus-wps-failed') +
          ' [' + req.error.name + ']';
      };
    }

    function wpsDialog(dialogID, callback) {
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

      var dialog = document.getElementById(dialogID);
      if (!dialog)
        return;

      var apSelectionArea = dialog.querySelector('#wifi-wps-pin-aps');
      var apSelect = apSelectionArea.querySelector('select');
      for (var i = apSelect.childNodes.length - 1; i >= 0; i--) {
        apSelect.removeChild(apSelect.childNodes[i]);
      }
      var option = document.createElement('option');
      option.textContent = _('wpsAnyAp');
      option.value = 'any';
      apSelect.appendChild(option);
      var wpsAvailableNetworks = gNetworkList.getWpsAvailableNetworks();
      for (var i = 0; i < wpsAvailableNetworks.length; i++) {
        option = document.createElement('option');
        option.textContent = wpsAvailableNetworks[i].ssid;
        option.value = wpsAvailableNetworks[i].bssid;
        apSelect.appendChild(option);
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
        apSelectionArea.hidden = method === 'pbc';
      }

      var radios = dialog.querySelectorAll('input[type="radio"]');
      for (var i = 0; i < radios.length; i++) {
        radios[i].onchange = onWpsMethodChange;
      }
      onWpsMethodChange();

      openDialog(dialogID, function submit() {
        callback(apSelect.options[apSelect.selectedIndex].value,
          dialog.querySelector("input[type='radio']:checked").value,
          pinInput.value);
      });
    }
  };

  // create a network list item
  function newListItem(network, callback) {
    /**
     * A Wi-Fi list item has the following HTML structure:
     *   <li>
     *     <aside class="pack-end wifi-icon level-[?] [secured]"></aside>
     *     <small> Network Security </small>
     *     <a> Network SSID </a>
     *   </li>
     */

    // icon
    var icon = document.createElement('aside');
    icon.classList.add('pack-end');
    icon.classList.add('wifi-icon');
    var level = Math.min(Math.floor(network.relSignalStrength / 20), 4);
    icon.classList.add('level-' + level);

    // ssid
    var ssid = document.createElement('a');
    ssid.textContent = network.ssid;

    // supported authentication methods
    var small = document.createElement('small');
    var keys = WifiHelper.getSecurity(network);
    if (keys && keys.length) {
      small.textContent = _('securedBy', { capabilities: keys.join(', ') });
      icon.classList.add('secured');
    } else {
      small.textContent = _('securityOpen');
    }

    // create list item
    var li = document.createElement('li');
    li.appendChild(icon);
    li.appendChild(small);
    li.appendChild(ssid);

    // Show connection status
    icon.classList.add('wifi-signal');
    if (WifiHelper.isConnected(network)) {
      small.textContent = _('shortStatus-connected');
      icon.classList.add('connected');
      li.classList.add('active');
    }

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
    var networks = {};

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
      networks = {};

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
      if (!gWifiManager.enabled || document.hidden) {
        scanning = false;
        gScanPending = true;
        return;
      }

      scanning = true;
      var req = WifiHelper.getAvailableAndKnownNetworks();

      req.onsuccess = function onScanSuccess() {
        clear(false);
        var allNetworks = req.result;
        for (var i = 0; i < allNetworks.length; ++i) {
          var network = allNetworks[i];
          // use ssid + security as a composited key
          var key = network.ssid + '+' +
            WifiHelper.getSecurity(network).join('+');
          // keep connected network first, or select the highest strength
          if (!networks[key] || network.connected) {
            networks[key] = network;
          } else {
            if (!networks[key].connected &&
                network.relSignalStrength > networks[key].relSignalStrength) {
              networks[key] = network;
            }
          }
        }

        var networkKeys = Object.getOwnPropertyNames(networks);

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

            // put connected network on top of list
            if (WifiHelper.isConnected(network)) {
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
    function display(network, networkStatus) {
      if (!network) {
        return;
      }

      var key = network.ssid + '+' +
        WifiHelper.getSecurity(network).join('+');
      var listItem = index[key];
      var active = list.querySelector('.active');
      if (active && active != listItem) {
        active.classList.remove('active');
        active.querySelector('small').textContent =
            _('shortStatus-disconnected');
        active.querySelector('aside').classList.remove('connecting');
        active.querySelector('aside').classList.remove('connected');
      }
      if (listItem) {
        listItem.classList.add('active');
        listItem.querySelector('small').textContent =
                                            _('shortStatus-' + networkStatus);
        if (networkStatus === 'connecting') {
          listItem.querySelector('aside').classList.add('connecting');
        }
        if (networkStatus === 'connected') {
          listItem.querySelector('aside').classList.remove('connecting');
        }
      }
    }

    // get WPS available networks
    function getWpsAvailableNetworks() {
      var ssids = Object.getOwnPropertyNames(networks);
      var wpsAvailableNetworks = [];
      for (var i = 0; i < ssids.length; i++) {
        var network = networks[ssids[i]];
        if (WifiHelper.isWpsAvailable(network)) {
          wpsAvailableNetworks.push(network);
        }
      }
      return wpsAvailableNetworks;
    }

    // API
    return {
      get autoscan() { return autoscan; },
      set autoscan(value) { autoscan = value; },
      display: display,
      clear: clear,
      scan: scan,
      get scanning() { return scanning; },
      getWpsAvailableNetworks: getWpsAvailableNetworks
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
          var key = network.ssid + '+' +
            WifiHelper.getSecurity(network).join('+');
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

  // create a certificate list item
  function newCertificateItem(caName) {
    var label = document.createElement('label');
    label.className = 'pack-checkbox';
    var input = document.createElement('input');
    input.type = 'checkbox';
    input.name = caName;
    input.checked = false;
    var span = document.createElement('span');
    span.textContent = caName;

    label.appendChild(input);
    label.appendChild(span);

    var li = document.createElement('li');
    li.appendChild(label);
    return li;
  }

  function toggleDeleteCertificateBtn(enabled) {
    document.getElementById('deleteCertificate').disabled = !enabled;
  }

  function toggleImportCertificateBtn(enabled) {
    document.getElementById('importCertificate').disabled = !enabled;
  }

  // imported certificate list
  var gCertificateList = (function certificateList(list) {
    var certificateList = [];

    // get list
    function getList() {
      return certificateList;
    }

    // return true:  if more than one selected item
    // return false: if no selected item
    function isItemSelected() {
      return list.querySelector('input[type=checkbox]:checked') != null;
    }

    // delete the selected certificate items in list
    function deleteCertificate() {
      var countItemDeleted = 0;
      var checkedInputList =
        list.querySelectorAll('input[type=checkbox]:checked');

      for (var i = 0; i < checkedInputList.length; i++) {
        var nickname = checkedInputList[i].name;
        var certRequest = gWifiManager.deleteCert(nickname);

        certRequest.onsuccess = function() {
          if (++countItemDeleted == checkedInputList.length) {
            // refresh certificate list
            scan();
          }
        };
        certRequest.onerror = function() {
          if (++countItemDeleted == checkedInputList.length) {
            // refresh certificate list
            scan();
          }
          // Pop out alert message for certificate deletion failed
          var dialog = document.getElementById('certificate-deletion-failed');
          dialog.hidden = false;
          dialog.onsubmit = function confirm() {
            dialog.hidden = true;
          };
        };
      }
    }

    // clear the certificate list
    function clear() {
      while (list.hasChildNodes()) {
        list.removeChild(list.lastChild);
      }
    }

    // scan and list imported certificates
    function scan() {
      clear();

      var certRequest = gWifiManager.getImportedCerts();

      certRequest.onsuccess = function() {
        var certList = certRequest.result;
        // save the imported server certificates
        certificateList = certList.ServerCert;

        // display certificate list
        if (certificateList.length) {
          for (var i = 0; i < certificateList.length; i++) {
            list.appendChild(newCertificateItem(certificateList[i]));
          }
          // add event listener for update toggle delete/import cert. buttons
          var inputItems = list.querySelectorAll('input');
          for (var i = 0; i < inputItems.length; i++) {
            inputItems[i].onchange = function() {
              // To enable/disable delete, import certitifate buttons
              // via items selected or not.
              var option = isItemSelected();
              toggleDeleteCertificateBtn(option);
              toggleImportCertificateBtn(!option);
            };
          }
        } else {
          // display "no certificate" message while no any imported certificate
          list.appendChild(newExplanationItem('noCertificate'));
        }
      };
      certRequest.onerror = function() {
        console.warn('getImportedCerts failed');
      };

      toggleDeleteCertificateBtn(false);
      toggleImportCertificateBtn(true);
    }

    // Once Bug 917102 landed, we can remove the detection.
    // Detect platform is supporting certificate or not..
    if (gWifiManager.getImportedCerts) {
      // API is ready.
      scan();
    } else {
      // API is not ready yet.
      // Hide the "Manage certificates" button since API is not ready yet.
      var manageCertificatesBtn = document.getElementById('manageCertificates');
      manageCertificatesBtn.parentNode.parentNode.hidden = true;
      console.warn('Import certificate API is not ready yet!');
    }


    // API
    return {
      getList: getList,
      scan: scan,
      deleteCertificate: deleteCertificate
    };
  }) (document.getElementById('wifi-certificateList'));

  // when certificate file imported, update the imported certificate list
  window.addEventListener('certificate-imported', function() {
    gCertificateList.scan();
  });

  document.getElementById('manageCertificates').onclick =
    function knownCertificates() {
      gCertificateList.scan();
      openDialog('wifi-manageCertificates');
  };

  document.getElementById('deleteCertificate').onclick =
    function deleteCertificate() {
      gCertificateList.deleteCertificate();
  };

  document.getElementById('importCertificate').onclick =
    function importCertificate() {
      // dispatch event for gSelectCertificateFiles.scan();
      dispatchEvent(new CustomEvent('scan-certificate-file'));
      openDialog('wifi-selectCertificateFile');
  };

  // join hidden network
  document.getElementById('joinHidden').onclick = function joinHiddenNetwork() {
    toggleNetwork();
  };

  // load the imported certificates into select options
  function loadImportedCertificateOptions(select) {
    // reset the option to be <option value="none">--</option> only
    for (var i = 0; i < select.options.length - 1; i++) {
      select.remove(1);
    }

    var certificateList = gCertificateList.getList();
    for (var i = 0; i < certificateList.length; i++) {
      var option = document.createElement('option');
      option.text = certificateList[i];
      option.value = certificateList[i];
      select.add(option, null);
    }
  }

  // UI to connect/disconnect
  function toggleNetwork(network) {
    if (!network) {
      // offline, hidden SSID
      network = {};
      wifiDialog('wifi-joinHidden', wifiConnect);
    } else if (WifiHelper.isConnected(network)) {
      // online: show status + offer to disconnect
      wifiDialog('wifi-status', wifiDisconnect);
    } else if (network.password && (network.password == '*')) {
      // offline, known network (hence the '*' password value):
      // no further authentication required.
      WifiHelper.setPassword(network);
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
    }

    function wifiDisconnect() {
      settings.createLock().set({'wifi.connect_via_settings': false});
      gWifiManager.forget(network);
      // get available network list
      gNetworkList.scan();
      gCurrentNetwork = null;
    }

    // generic wifi property dialog
    function wifiDialog(dialogID, callback, key) {
      var dialog = document.getElementById(dialogID);

      // authentication fields
      var identity, password, showPassword, eap,
          authPhase2, certificate, description;

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

        eap = dialog.querySelector('li.eap select');
        // Once Bug 917102 landed, we could remove the detection.
        // Detect platform is supporting certificate or not..
        if (!gWifiManager.getImportedCerts) {
          console.warn('Import certificate API is not ready yet!');
          // API is not ready yet.
          // Remove the EAP methods(PEAP, TLS, TTLS) which are not supported.
          while (eap.options.length != 1) {
            eap.remove(1);
          }
        }

        authPhase2 = dialog.querySelector('li.auth-phase2 select');
        certificate = dialog.querySelector('li.server-certificate select');
        loadImportedCertificateOptions(certificate);
        description = dialog.querySelector('li.server-certificate-description');
      }

      if (dialogID === 'wifi-joinHidden') {
        network.hidden = true;

        // Make sure ssid length is less then 32 bytes.
        var ssid = dialog.querySelector('input[name=ssid]');
        ssid.oninput = function() {
          var ssidStr = ssid.value;
          // Non-ASCII chars in SSID will be encoded by UTF-8, and length of
          // each char might be longer than 1 byte.
          // Use encodeURIComponent() to encode ssid, then calculate correct
          // length.
          if (encodeURIComponent(ssidStr).replace(/%[\w\d]{2}/g, '1')
                .length > 32) {
            ssid.value = ssidStr.substring(0, ssidStr.length - 1);
          }
        };
      }

      // disable the "OK" button if the password is too short
      if (password) {
        var checkPassword = function checkPassword() {
          dialog.querySelector('button[type=submit]').disabled =
            !WifiHelper.isValidInput(key,
                                     password.value,
                                     identity.value,
                                     eap.value);
        };
        eap.onchange = function() {
          checkPassword();
          changeDisplay(key);
        };
        password.oninput = checkPassword;
        identity.oninput = checkPassword;
        checkPassword();
      }

      // initialisation
      var keys = WifiHelper.getSecurity(network);
      var security = (keys && keys.length) ? keys.join(', ') : '';
      var sl = Math.min(Math.floor(network.relSignalStrength / 20), 4);
      var updateBaseStationInfo = function update_base_station_info() {
        dialog.querySelector('[data-ssid]').textContent = network.ssid;
        dialog.querySelector('[data-signal]').textContent =
            _('signalLevel' + sl);
        dialog.querySelector('[data-security]').textContent =
            security || _('securityNone');
        dialog.dataset.security = security;
      };
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
          updateBaseStationInfo();
        break;

        case 'wifi-auth':
          // network info -- #wifi-auth
          updateBaseStationInfo();
          changeDisplay(security);
          break;

        case 'wifi-joinHidden':
          var security = dialog.querySelector('select');
          var onSecurityChange = function() {
            key = security.selectedIndex ? security.value : '';
            WifiHelper.setSecurity(network, [key]);
            dialog.dataset.security = key;
            checkPassword();
            changeDisplay(key);
          };
          security.onchange = onSecurityChange;
          onSecurityChange();
          break;
      }

      // change element display
      function changeDisplay(security) {
        if (dialogID !== 'wifi-status') {
          if (security === 'WEP' || security === 'WPA-PSK') {
            identity.parentNode.style.display = 'none';
            password.parentNode.style.display = 'block';
            authPhase2.parentNode.parentNode.style.display = 'none';
            certificate.parentNode.parentNode.style.display = 'none';
            description.style.display = 'none';
          } else if (security === 'WPA-EAP') {
            if (eap) {
              switch (eap.value) {
                case 'SIM':
                  identity.parentNode.style.display = 'none';
                  password.parentNode.style.display = 'none';
                  authPhase2.parentNode.parentNode.style.display = 'none';
                  certificate.parentNode.parentNode.style.display = 'none';
                  description.style.display = 'none';
                  break;
                case 'PEAP':
                case 'TLS':
                case 'TTLS':
                  identity.parentNode.style.display = 'block';
                  password.parentNode.style.display = 'block';
                  authPhase2.parentNode.parentNode.style.display = 'block';
                  certificate.parentNode.parentNode.style.display = 'block';
                  description.style.display = 'block';
                  break;
                default:
                  break;
              }
            }
          } else {
            identity.parentNode.style.display = 'none';
            password.parentNode.style.display = 'none';
          }
        }
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
          WifiHelper.setPassword(network,
                                 password.value,
                                 identity.value,
                                 eap.value,
                                 authPhase2.value,
                                 certificate.value);
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
    gNetworkList.display(gCurrentNetwork, networkStatus);

    gWifiInfoBlock.textContent =
        _('fullStatus-' + networkStatus, gWifiManager.connection.network);

    if (networkStatus === 'connectingfailed' && gCurrentNetwork) {
      settings.createLock().set({'wifi.connect_via_settings': false});
      // connection has failed, probably an authentication issue...
      delete(gCurrentNetwork.password);
      gWifiManager.forget(gCurrentNetwork); // force a new authentication dialog
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
        wpsStatusReset();
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

