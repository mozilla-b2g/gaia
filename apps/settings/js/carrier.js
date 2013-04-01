/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// handle carrier settings
var Carrier = (function newCarrier(window, document, undefined) {
  var APN_FILE = '/shared/resources/apn.json';
  var _ = window.navigator.mozL10n.get;

  /**
   * gCompatibleAPN holds all compatible APNs matching the current iccInfo
   * (mcc,mnc) for every usage filter
   */

  var mobileConnection = getMobileConnection();
  var gCompatibleAPN = null;

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
    var xhr = new XMLHttpRequest();
    xhr.open('GET', APN_FILE, true);
    xhr.responseType = 'json';
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4 && (xhr.status == 200 || xhr.status === 0)) {
        var apn = xhr.response;
        var mcc = mobileConnection.iccInfo.mcc;
        var mnc = mobileConnection.iccInfo.mnc;
        // get a list of matching APNs
        gCompatibleAPN = apn[mcc] ? (apn[mcc][mnc] || []) : [];
        callback(filter(gCompatibleAPN), usage);
      }
    };
    xhr.send();
  }

  // update APN fields
  function updateAPNList(apnItems, usage) {
    var apnPanel = document.getElementById('carrier-' + usage + 'Settings');
    if (!apnPanel) // unsupported APN type
      return;

    var apnList = apnPanel.querySelector('.apnSettings-list');
    var advForm = apnPanel.querySelector('.apnSettings-advanced');
    var lastItem = apnList.querySelector('.apnSettings-custom');

    // helper
    function rilData(name) {
      var selector = 'input[data-setting="ril.' + usage + '.' + name + '"]';
      return document.querySelector(selector);
    }

    // create a button to apply <apn> data to the current fields
    function createAPNItem(item) {
      // create an <input type="radio"> element
      var input = document.createElement('input');
      input.type = 'radio';
      input.name = usage + 'ApnSettingsCarrier';
      input.dataset.setting = 'ril.' + usage + '.carrier';
      input.value = item.carrier || item.apn;
      input.onclick = function fillAPNData() {
        rilData('apn').value = item.apn || '';
        rilData('user').value = item.user || '';
        rilData('passwd').value = item.password || '';
        rilData('httpProxyHost').value = item.proxy || '';
        rilData('httpProxyPort').value = item.port || '';
        if (usage == 'mms') {
          rilData('mmsc').value = item.mmsc || '';
          rilData('mmsproxy').value = item.mmsproxy || '';
          rilData('mmsport').value = item.mmsport || '';
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
          if (!found) {
            lastItem.querySelector('input').checked = true;
          }
        }
      };
    }

    // set current APN to 'custom' on user modification
    advForm.onchange = function onCustomInput(event) {
      lastItem.querySelector('input').checked = true;
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
     * settingKey        : The key of the setting
     * dialogID          : The ID of the warning dialog
     * explanationItemID : The ID of the explanation item
     */
    var initWarnings =
      function initWarnings(settingKey, dialogID, explanationItemID) {
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
            }
          });
        } else {
          explanationItem.hidden = true;
        }
      };

    initWarnings('ril.data.enabled', 'carrier-dc-warning',
      'dataConnection-expl');
    initWarnings('ril.data.roaming_enabled', 'carrier-dr-warning',
      'dataRoaming-expl');

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
  }

  // network operator selection: auto/manual
  var opAutoSelect = document.getElementById('operator-autoSelect');
  var opAutoSelectInput = opAutoSelect.querySelector('input');
  var opAutoSelectState = opAutoSelect.querySelector('small');

  // XXX for some reason, networkSelectionMode is (almost?) always null
  // so we're assuming the auto-selection is ON by default.
  function updateSelectionMode(scan) {
    var mode = mobileConnection.networkSelectionMode;
    opAutoSelectState.textContent = mode || '';
    opAutoSelectInput.checked = !mode || (mode === 'automatic');
    if (!opAutoSelectInput.checked && scan) {
      gOperatorNetworkList.scan();
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
    state.textContent = network.state;

    // create list item
    var li = document.createElement('li');
    li.appendChild(state);
    li.appendChild(name);

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

    // select operator
    function selectOperator(network, messageElement) {
      var _ = window.navigator.mozL10n.get;
      var req = mobileConnection.selectNetwork(network);
      messageElement.textContent = _('operator-status-connecting');
      messageElement.dataset.l10nId = 'operator-status-connecting';
      req.onsuccess = function onsuccess() {
        messageElement.textContent = _('operator-status-connected');
        messageElement.dataset.l10nId = 'operator-status-connected';
        updateSelectionMode(false);
      };
      req.onerror = function onsuccess() {
        messageElement.textContent = _('operator-status-connectingfailed');
        messageElement.dataset.l10nId = 'operator-status-connectingfailed';
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

  // public API
  return {
    // display matching APNs
    fillAPNList: function carrier_fillAPNList(usage) {
      queryAPN(updateAPNList, usage);
    },

    // startup
    init: function carrier_init() {
      Connectivity.updateCarrier(); // see connectivity.js
      updateSelectionMode(true);
      initDataConnectionAndRoamingWarnings();

      // XXX this should be done later -- not during init()
      this.fillAPNList('data');
      // XXX commented this line because MMS Settings is hidden
      // this.fillAPNList('mms');
      this.fillAPNList('supl');
    }
  };
})(this, document);

// startup
navigator.mozL10n.ready(Carrier.init.bind(Carrier));

