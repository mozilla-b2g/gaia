/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// handle carrier settings
navigator.mozL10n.ready(function carrierSettings() {
  var APN_FILE = '/shared/resources/apn.json';
  var _ = window.navigator.mozL10n.get;
  const AUTH_TYPES = ['none', 'pap', 'chap', 'papOrChap'];

  /**
   * gCompatibleAPN holds all compatible APNs matching the current iccInfo
   * (mcc,mnc) for every usage filter
   */

  var mobileConnection = getMobileConnection();
  var gCompatibleAPN = null;

  var mccMncCodes = { mcc: '-1', mnc: '-1' };

  // Read the mcc/mnc codes from the setting database, then trigger callback.
  function getMccMncCodes(callback) {
    var settings = Settings.mozSettings;
    if (!settings) {
      callback();
    }
    var transaction = settings.createLock();
    var mccKey = 'operatorvariant.mcc';
    var mncKey = 'operatorvariant.mnc';

    var mccRequest = transaction.get(mccKey);
    mccRequest.onsuccess = function() {
      mccMncCodes.mcc = mccRequest.result[mccKey] || '0';
      var mncRequest = transaction.get(mncKey);
      mncRequest.onsuccess = function() {
        mccMncCodes.mnc = mncRequest.result[mncKey] || '0';
        callback();
      };
    };
  }

  // query <apn> elements matching the mcc/mnc arguments
  function queryAPN(callback, usage) {
    if (!callback)
      return;

    var usageFilter = usage;
    if (!usage || usage == 'data') {
      usageFilter = 'default';
    }

    // filter APNs by usage
    var filter = function(apnList) {
      var found = [];
      for (var i = 0; i < apnList.length; i++) {
        if (apnList[i].type.indexOf(usageFilter) != -1) {
          found.push(apnList[i]);
        }
      }
      return found;
    };

    // early way out if the query has already been performed
    if (gCompatibleAPN) {
      callback(filter(gCompatibleAPN), usage);
      return;
    }

    // load and query APN database, then trigger callback on results
    loadJSON(APN_FILE, function loadAPN(apn) {
      var mcc = mccMncCodes.mcc;
      var mnc = mccMncCodes.mnc;
      // get a list of matching APNs
      gCompatibleAPN = apn[mcc] ? (apn[mcc][mnc] || []) : [];
      callback(filter(gCompatibleAPN), usage);
    });
  }

  // helper
  function rilData(usage, name) {
    var selector = 'input[data-setting="ril.' + usage + '.' + name + '"]';
    return document.querySelector(selector);
  }

  // update APN fields
  function updateAPNList(apnItems, usage) {
    var apnPanel = document.getElementById('carrier-' + usage + 'Settings');
    if (!apnPanel) // unsupported APN type
      return;

    var apnList = apnPanel.querySelector('.apnSettings-list');
    var advForm = apnPanel.querySelector('.apnSettings-advanced');
    var lastItem = apnList.querySelector('.apnSettings-custom');

    // create a button to apply <apn> data to the current fields
    function createAPNItem(item) {
      // create an <input type="radio"> element
      var input = document.createElement('input');
      input.type = 'radio';
      input.name = usage + 'ApnSettingsCarrier';
      input.dataset.setting = 'ril.' + usage + '.carrier';
      input.value = item.carrier || item.apn;
      input.onclick = function fillAPNData() {
        rilData(usage, 'apn').value = item.apn || '';
        rilData(usage, 'user').value = item.user || '';
        rilData(usage, 'passwd').value = item.password || '';
        rilData(usage, 'httpProxyHost').value = item.proxy || '';
        rilData(usage, 'httpProxyPort').value = item.port || '';
        if (usage == 'mms') {
          rilData(usage, 'mmsc').value = item.mmsc || '';
          rilData(usage, 'mmsproxy').value = item.mmsproxy || '';
          rilData(usage, 'mmsport').value = item.mmsport || '';
        }
        var input = document.getElementById('ril-' + usage + '-authType');
        input.value = item.authtype ? AUTH_TYPES[input.value] : 'notDefined';
        var parent = input.parentElement;
        var button = input.previousElementSibling;
        var index = input.selectedIndex;
        if (index >= 0) {
          var selection = input.options[index];
          button.textContent = selection.textContent;
          button.dataset.l10nId = selection.dataset.l10nId;
        }
      };

      // include the radio button element in a list item
      var span = document.createElement('span');
      var label = document.createElement('label');
      label.appendChild(input);
      label.appendChild(span);
      var a = document.createElement('a');
      a.textContent = item.carrier || item.apn;
      var li = document.createElement('li');
      li.appendChild(label);
      li.appendChild(a);

      return li;
    }

    // empty the APN list
    while (lastItem.previousElementSibling) {
      apnList.removeChild(apnList.firstElementChild);
    }

    // fill the APN list
    for (var i = 0; i < apnItems.length; i++) {
      apnList.insertBefore(createAPNItem(apnItems[i]), lastItem);
    }

    // helper
    function fillCustomAPNSettingFields() {
      var keys = ['apn', 'user', 'passwd', 'httpProxyHost', 'httpProxyPort'];
      if (usage === 'mms') {
        keys.push('mmsc', 'mmsproxy', 'mmsport');
      }

      keys.forEach(function(key) {
        asyncStorage.getItem(
          'ril.' + usage + '.custom.' + key, function(value) {
            rilData(usage, key).value = value || '';
        });
      });

      asyncStorage.getItem(
        'ril.' + usage + '.custom.authtype', function(value) {
          var input = document.getElementById('ril-' + usage + '-authType');
          input.value = value || 'notDefined';
          var parent = input.parentElement;
          var button = input.previousElementSibling;
          var index = input.selectedIndex;
          if (index >= 0) {
            var selection = input.options[index];
            button.textContent = selection.textContent;
            button.dataset.l10nId = selection.dataset.l10nId;
          }
      });
    }

    //helper
    function storeCustomAPNSettingFields() {
      var keys = ['apn', 'user', 'passwd', 'httpProxyHost', 'httpProxyPort'];
      if (usage === 'mms') {
        keys.push('mmsc', 'mmsproxy', 'mmsport');
      }

      keys.forEach(function(key) {
        asyncStorage.setItem('ril.' + usage + '.custom.' + key,
                             rilData(usage, key).value);
      });
      var authType = document.getElementById('ril-' + usage + '-authType');
      asyncStorage.setItem('ril.' + usage + '.custom.authtype', authType.value);
    }

    // find the current APN, relying on the carrier name
    var settings = Settings.mozSettings;
    if (settings) {
      var radios = apnList.querySelectorAll('input[type="radio"]');
      var key = 'ril.' + usage + '.carrier';
      var request = settings.createLock().get(key);
      request.onsuccess = function() {
        var found = false;
        if (request.result[key] !== undefined) {
          for (var i = 0; i < radios.length; i++) {
            radios[i].checked = (request.result[key] === radios[i].value);
            found = found || radios[i].checked;
          }
          // load custom APN settings when the user clicks on the input
          lastItem.querySelector('input').addEventListener('click', function() {
              fillCustomAPNSettingFields();
          });
          if (!found) {
            lastItem.querySelector('input').checked = true;
            fillCustomAPNSettingFields();
          }
        }
      };
    }

    // set current APN to 'custom' on user modification
    advForm.onchange = function onCustomInput(event) {
      lastItem.querySelector('input').checked = true;
      storeCustomAPNSettingFields();
    };

    // force data connection to restart if changes are validated
    var submitButton = apnPanel.querySelector('button[type=submit]');
    submitButton.addEventListener('click', restartDataConnection);
  }

  // restart data connection by toggling it off and on again
  function restartDataConnection() {
    var settings = Settings.mozSettings;
    if (!settings)
      return;

    var key = 'ril.data.enabled';
    function setDataState(state) {
      var cset = {};
      cset[key] = state;
      settings.createLock().set(cset);
    }

    var request = settings.createLock().get(key);
    request.onsuccess = function() {
      if (request.result[key]) {
        setDataState(false);    // turn data off
        setTimeout(function() { // turn data back on
          setDataState(true);
        }, 2500); // restart data connection in 2.5s
      }
    };
  }

  function initDataConnectionAndRoamingWarnings() {
    var settings = Settings.mozSettings;

    /*
     * settingKey              : The key of the setting
     * dialogID                : The ID of the warning dialog
     * explanationItemID       : The ID of the explanation item
     * warningDisabledCallback : Callback when the warning is disabled
     */
    var initWarnings =
      function initWarnings(settingKey, dialogID, explanationItemID,
        warningDisabledCallback) {
        if (settings) {
          var warningDialogEnabledKey = settingKey + '.warningDialog.enabled';
          var explanationItem = document.getElementById(explanationItemID);

          var getWarningEnabled = function(callback) {
            window.asyncStorage.getItem(warningDialogEnabledKey,
              function(warningEnabled) {
                if (warningEnabled == null) {
                  warningEnabled = true;
                }
                callback(warningEnabled);
            });
          };

          var setState = function(state) {
            var cset = {};
            cset[settingKey] = !!state;
            settings.createLock().set(cset);
          };

          var onSubmit = function() {
            window.asyncStorage.setItem(warningDialogEnabledKey, false);
            explanationItem.hidden = false;
            setState(true);
            if (warningDisabledCallback)
              warningDisabledCallback();
          };

          var onReset = function() {
            window.asyncStorage.setItem(warningDialogEnabledKey, true);
          };

          // register an observer to monitor setting changes
          settings.addObserver(settingKey, function(event) {
            getWarningEnabled(function gotWarningEnabled(warningEnabled) {
              var enabled = event.settingValue;
              if (warningEnabled) {
                if (enabled) {
                  setState(false);
                  openDialog(dialogID, onSubmit, onReset);
                }
              } else {
                explanationItem.hidden = false;
              }
            });
          });

          // initialize the visibility of the warning message
          getWarningEnabled(function gotWarningEnabled(warningEnabled) {
            if (warningEnabled) {
              var request = settings.createLock().get(settingKey);
              request.onsuccess = function() {
                var enabled = false;
                if (request.result[settingKey] !== undefined) {
                  enabled = request.result[settingKey];
                }

                if (enabled) {
                  window.asyncStorage.setItem(warningDialogEnabledKey, false);
                  explanationItem.hidden = false;
                }
              };
            } else {
              explanationItem.hidden = false;
              if (warningDisabledCallback)
                warningDisabledCallback();
            }
          });
        } else {
          explanationItem.hidden = true;
        }
      };

    var onDCWarningDisabled = function() {
      // Turn off data roaming automatically when users turn off data connection
      if (settings) {
        settings.addObserver('ril.data.enabled', function(event) {
          if (!event.settingValue) {
            var cset = {};
            cset['ril.data.roaming_enabled'] = false;
            settings.createLock().set(cset);
          }
        });
      }
    };

    initWarnings('ril.data.enabled', 'carrier-dc-warning',
      'dataConnection-expl', onDCWarningDisabled);
    initWarnings('ril.data.roaming_enabled', 'carrier-dr-warning',
      'dataRoaming-expl');
  }

  // network operator selection: auto/manual
  var opAutoSelect = document.getElementById('operator-autoSelect');
  var opAutoSelectInput = opAutoSelect.querySelector('input');
  var opAutoSelectState = opAutoSelect.querySelector('small');

  function updateSelectionMode(scan) {
    var mode = mobileConnection.networkSelectionMode;
    // we're assuming the auto-selection is ON by default.
    var auto = !mode || (mode === 'automatic');
    opAutoSelectInput.checked = auto;
    if (auto) {
      localize(opAutoSelectState, 'operator-networkSelect-auto');
    } else {
      opAutoSelectState.dataset.l10nId = '';
      opAutoSelectState.textContent = mode;
      if (scan) {
        gOperatorNetworkList.scan();
      }
    }
  }

  // create a network operator list item
  function newListItem(network, callback) {
    /**
     * A network list item has the following HTML structure:
     *   <li>
     *     <small> Network State </small>
     *     <a> Network Name </a>
     *   </li>
     */

    // name
    var name = document.createElement('a');
    name.textContent = network.shortName || network.longName;

    // state
    var state = document.createElement('small');
    state.textContent =
      network.state ? _('state-' + network.state) : _('state-unknown');

    // create list item
    var li = document.createElement('li');
    li.appendChild(state);
    li.appendChild(name);

    li.dataset.cachedState = network.state || 'unknown';
    li.classList.add('operatorItem');

    // bind connection callback
    li.onclick = function() {
      callback(network, state);
    };
    return li;
  }

  // operator network list
  // XXX note: scanning takes a while, and most of the time it never succeeds
  // (doesn't raise any error either) but I swear I've seen it working.
  var gOperatorNetworkList = (function operatorNetworkList(list) {
    // get the "Searching..." and "Search Again" items, respectively
    var infoItem = list.querySelector('li[data-state="on"]');
    var scanItem = list.querySelector('li[data-state="ready"]');
    scanItem.onclick = scan;

    // clear the list
    function clear() {
      var operatorItems = list.querySelectorAll('li:not([data-state])');
      var len = operatorItems.length;
      for (var i = len - 1; i >= 0; i--) {
        list.removeChild(operatorItems[i]);
      }
    }

    function resetOperatorItemState() {
      var operatorItems =
        Array.prototype.slice.call(list.querySelectorAll('.operatorItem'));
      operatorItems.forEach(function(operatorItem) {
        var state = operatorItem.dataset.cachedState;
        var messageElement = operatorItem.querySelector('small');

        if (!state) {
          state = 'unknown';
        } else if (state === 'current') {
          state = 'available';
        }

        localize(messageElement, 'state-' + state);
      });
    }

    // select operator
    function selectOperator(network, messageElement) {
      // update current network state as 'available' (the string display
      // on the network to connect)
      resetOperatorItemState();

      var req = mobileConnection.selectNetwork(network);
      localize(messageElement, 'operator-status-connecting');
      req.onsuccess = function onsuccess() {
        localize(messageElement, 'operator-status-connected');
        updateSelectionMode(false);
      };
      req.onerror = function onsuccess() {
        localize(messageElement, 'operator-status-connectingfailed');
        updateSelectionMode(false);
      };
    }

    // scan available operators
    function scan() {
      clear();
      list.dataset.state = 'on'; // "Searching..."
      var req = mobileConnection.getNetworks();
      req.onsuccess = function onsuccess() {
        var networks = req.result;
        for (var i = 0; i < networks.length; i++) {
          var listItem = newListItem(networks[i], selectOperator);
          list.insertBefore(listItem, scanItem);
        }
        list.dataset.state = 'ready'; // "Search Again" button
      };

      req.onerror = function onScanError(error) {
        console.warn('carrier: could not retrieve any network operator. ');
        list.dataset.state = 'ready'; // "Search Again" button
      };
    }

    // API
    return {
      get state() { return list.dataset.state; },
      set state(value) { list.dataset.state = value; },
      clear: clear,
      scan: scan
    };
  })(document.getElementById('availableOperators'));

  // toggle autoselection
  opAutoSelectInput.onchange = function() {
    if (opAutoSelectInput.checked) {
      gOperatorNetworkList.state = 'off';
      gOperatorNetworkList.clear();
      var req = mobileConnection.selectNetworkAutomatically();
      req.onsuccess = function() {
        updateSelectionMode(false);
      };
    } else {
      gOperatorNetworkList.scan();
    }
  };

  // startup
  Connectivity.updateCarrier(); // see connectivity.js
  updateSelectionMode(true);
  initDataConnectionAndRoamingWarnings();

  // XXX this should be done later
  getMccMncCodes(function() {
    queryAPN(updateAPNList, 'data');
    queryAPN(updateAPNList, 'mms');
    queryAPN(updateAPNList, 'supl');
  });
});

