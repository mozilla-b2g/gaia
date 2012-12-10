/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// handle carrier settings
var Carrier = (function newCarrier(window, document, undefined) {
  var APN_FILE = '/shared/resources/apn.json';

  /**
   * gCompatibleAPN holds all compatible APNs matching the current iccInfo
   * (mcc,mnc) for every usage filter
   */

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
        var mcc = gMobileConnection.iccInfo.mcc;
        var mnc = gMobileConnection.iccInfo.mnc;
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
      input.name = 'ril.' + usage + '.carrier';
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
    apnPanel.querySelector('button[type=submit]').onclick =
        restartDataConnection;
  }

  // restart data connection by toggling it off and on again
  function restartDataConnection(forceStart) {
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
      if (request.result[key] || forceStart) {
        setDataState(false);    // turn data off
        setTimeout(function() { // turn data back on
          setDataState(true);
        }, 2500); // restart data connection in 2.5s
      }
    };
  }

  // 2G|3G network selection
  document.getElementById('preferredNetworkType').onchange =
    restartDataConnection;

  // 'Data Roaming' message
  var settings = Settings.mozSettings;
  if (settings) {
    var _ = window.navigator.mozL10n.get;
    var dataRoamingSetting = 'ril.data.roaming_enabled';

    var displayDataRoamingMessage = function(enabled) {
      var messageID = 'dataRoaming-' + (enabled ? 'enabled' : 'disabled');
      document.getElementById('dataRoaming-expl').textContent = _(messageID);
    }

    // register an observer to monitor setting changes
    settings.addObserver(dataRoamingSetting, function(event) {
      displayDataRoamingMessage(event.settingValue);
    });

    // get the initial setting value
    var req = settings.createLock().get(dataRoamingSetting);
    req.onsuccess = function roaming_getStatusSuccess() {
      var enabled = req.result && req.result[dataRoamingSetting];
      displayDataRoamingMessage(enabled);
    };
  } else {
    document.getElementById('dataRoaming-expl').hidden = true;
  }

  // network operator selection: auto/manual
  var opAutoSelect = document.getElementById('operator-autoSelect');
  var opAutoSelectInput = opAutoSelect.querySelector('input');
  var opAutoSelectState = opAutoSelect.querySelector('small');

  // XXX for some reason, networkSelectionMode is (almost?) always null
  // so we're assuming the auto-selection is ON by default.
  function updateSelectionMode() {
    var mode = gMobileConnection.networkSelectionMode;
    opAutoSelectState.textContent = mode || '';
    opAutoSelectInput.checked = !mode || (mode == 'automatic');
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
    name.textContent = network.longName;

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
      var req = gMobileConnection.selectNetwork(network);
      messageElement.textContent = _('operator-status-connecting');
      req.onsuccess = function onsuccess() {
        messageElement.textContent = _('operator-status-connected');
      };
      req.onerror = function onsuccess() {
        messageElement.textContent = _('operator-status-connectingfailed');
      };
    }

    // scan available operators
    function scan() {
      list.dataset.state = 'on'; // "Searching..."
      var req = gMobileConnection.getNetworks();

      req.onsuccess = function onsuccess() {
        clear();
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
      gMobileConnection.selectNetworkAutomatically();
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
      updateSelectionMode();
      // XXX this should be done later -- not during init()
      this.fillAPNList('data');
      this.fillAPNList('mms');
      this.fillAPNList('supl');
    }
  };
})(this, document);

// startup
onLocalized(Carrier.init.bind(Carrier));

