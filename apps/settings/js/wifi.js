require([
  'modules/settings_utils'
], function(SettingsUtils) {
  'use strict';

  // handle Wi-Fi settings
  navigator.mozL10n.once(function wifiSettings() {
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

    var gScanStates =
      new Set(['connected', 'connectingfailed', 'disconnected']);
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
        var dialog = document.getElementById(dialogID);
        if (!dialog) {
          return;
        }

        var apSelectionArea = dialog.querySelector('#wifi-wps-pin-aps');
        var apSelect = apSelectionArea.querySelector('select');
        var pinItem = document.getElementById('wifi-wps-pin-area');
        var pinInput = pinItem.querySelector('input');

        SettingsUtils.openDialog(dialogID, {
          onSubmit: function submit() {
            callback(apSelect.options[apSelect.selectedIndex].value,
              dialog.querySelector("input[type='radio']:checked").value,
              pinInput.value);
          },
          wpsAvailableNetworks: gNetworkList.getWpsAvailableNetworks()
        });
      }
    };

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
        if (scanning) {
          return;
        }

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
            var key = WifiHelper.getNetworkKey(network);
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
              var listItem = WifiHelper.newListItem(network, toggleNetwork);

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
            list.insertBefore(
              WifiHelper.newExplanationItem('noNetworksFound'), scanItem);
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

        var key = WifiHelper.getNetworkKey(network);
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

    document.getElementById('manageNetworks').onclick =
      function knownNetworks() {
        SettingsUtils.openDialog('wifi-manageNetworks');
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
            // display "no certificate" message
            // while no any imported certificate
            list.appendChild(
              WifiHelper.newExplanationItem('noCertificate'));
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
        var manageCertificatesBtn =
          document.getElementById('manageCertificates');
        manageCertificatesBtn.parentNode.hidden = true;
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
        SettingsUtils.openDialog('wifi-manageCertificates');
    };

    document.getElementById('deleteCertificate').onclick =
      function deleteCertificate() {
        gCertificateList.deleteCertificate();
    };

    document.getElementById('importCertificate').onclick =
      function importCertificate() {
        // dispatch event for gSelectCertificateFiles.scan();
        dispatchEvent(new CustomEvent('scan-certificate-file'));
        SettingsUtils.openDialog('wifi-selectCertificateFile');
    };

    // join hidden network
    document.getElementById('joinHidden').onclick = function() {
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
        // We have 3 ids
        //   1. wifi-joinHidden
        //   2. wifi-status
        //   3. wifi-auth

        var dialog = document.getElementById(dialogID);
        var dialogOptions = {};

        // authentication fields
        var identity, password, showPassword, eap,
            authPhase2, certificate, description;

        // TODO
        // we have to put this logic to each panel
        if (dialogID == 'wifi-auth' || dialogID == 'wifi-joinHidden') {
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
          description =
            dialog.querySelector('li.server-certificate-description');
        }

        if (dialogID === 'wifi-joinHidden') {
          network.hidden = true;
        }

        // disable the "OK" button if the password is too short
        if (password) {
          var checkPassword = WifiHelper.checkPassword.bind(null, dialog, {
            key: key,
            password: password.value,
            identity: identity.value,
            eap: eap.value
          });
          eap.onchange = function() {
            checkPassword();
            SettingsUtils.changeDisplay(dialogID, key);
          };
          password.oninput = checkPassword;
          identity.oninput = checkPassword;
          checkPassword();
        }

        // initialisation
        var keys = WifiHelper.getSecurity(network);
        var security = (keys && keys.length) ? keys.join(', ') : '';
        var sl = Math.min(Math.floor(network.relSignalStrength / 20), 4);

        switch (dialogID) {
          case 'wifi-status':
            dialogOptions.network = network;
            dialogOptions.sl = sl;
            dialogOptions.security = security;
          break;

          case 'wifi-auth':
            dialogOptions.network = network;
            dialogOptions.sl = sl;
            dialogOptions.security = security;
            SettingsUtils.changeDisplay(dialogID, security);
            break;

          case 'wifi-joinHidden':
            dialogOptions.network = network;
            dialogOptions.security = security;
            break;
        }

        // reset dialog box
        function reset() {
          if (dialogID === 'wifi-auth' || dialogID === 'wifi-joinHidden') {
            identity.value = '';
            password.value = '';
            showPassword.checked = false;
          }
        }

        // OK|Cancel buttons
        function submit() {
          if (dialogID === 'wifi-joinHidden') {
            network.ssid = dialog.querySelector('input[name=ssid]').value;
            if (window.MozWifiNetwork !== undefined) {
              network = new window.MozWifiNetwork(network);
            }
          }
          if (key) {
            WifiHelper.setPassword(network, password.value, identity.value,
              eap.value, authPhase2.value, certificate.value);
          }
          if (callback) {
            callback();
          }
          reset();
        };

        dialogOptions.onSubmit = submit;
        dialogOptions.onReset = reset;

        // show dialog box
        SettingsUtils.openDialog(dialogID, dialogOptions);
      }
    }

    // update network state, called only when wifi enabled.
    function updateNetworkState() {
      var networkStatus = gWifiManager.connection.status;
      var networkProp = gWifiManager.connection.network ?
          {ssid: gWifiManager.connection.network.ssid} : null;

      // networkStatus has one of the following values:
      // connecting, associated, connected, connectingfailed, disconnected.
      gNetworkList.display(gCurrentNetwork, networkStatus);

      gWifiInfoBlock.textContent =
          _('fullStatus-' + networkStatus, networkProp);

      if (networkStatus === 'connectingfailed' && gCurrentNetwork) {
        settings.createLock().set({'wifi.connect_via_settings': false});
        // connection has failed, probably an authentication issue...
        delete(gCurrentNetwork.password);
        // force a new authentication dialog
        gWifiManager.forget(gCurrentNetwork);
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
});
