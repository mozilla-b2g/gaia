/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// create a fake mozMobileConnection if required (e.g. desktop browser)
var gMobileConnection = (function(window) {
  var navigator = window.navigator;
  if (('mozMobileConnection' in navigator) &&
      navigator.mozMobileConnection &&
      navigator.mozMobileConnection.data) {
    return navigator.mozMobileConnection;
  }

  var initialized = false;
  var fakeICCInfo = { shortName: 'Fake Free-Mobile', mcc: 208, mnc: 15 };
  var fakeNetwork = { shortName: 'Fake Orange F', mcc: 208, mnc: 1 };

  function fakeEventListener(type, callback, bubble) {
    if (initialized)
      return;

    // simulates a connection to a data network;
    setTimeout(function fakeCallback() {
      initialized = true;
      callback();
    }, 5000);
  }

  return {
    addEventListener: fakeEventListener,
    iccInfo: fakeICCInfo,
    get data() {
      return initialized ? { network: fakeNetwork } : null;
    }
  };
})(this);

// handle data settings
window.addEventListener('load', function getCarrierSettings() {
  var APN_FILE = 'serviceproviders.xml';
  var gUserChosenAPN = false;

  // query <apn> elements matching the mcc/mnc arguments
  function queryAPN(apnDocument, usageFilter) {
    var query = '//gsm[network-id' +
        '[@mcc=' + gMobileConnection.iccInfo.mcc + ']' + // Mobile Country Code
        '[@mnc=' + gMobileConnection.iccInfo.mnc + ']' + // Mobile Network Code
        ']/apn';

    var xpe = new XPathEvaluator();
    var nsResolver = xpe.createNSResolver(apnDocument);
    var result = xpe.evaluate(query, apnDocument, nsResolver, 0, null);

    var found = [];
    var res = result.iterateNext();
    while (res) { // turn each resulting XML element into a JS object
      var apn = {
        id: res.getAttribute('value'),
        name: '',
        plan: '',
        usage: '',
        username: '',
        password: '',
        dns: []
      };
      var node = res.firstElementChild;
      while (node) {
        if (node.tagName == 'dns') {
          apn.dns.push(node.textContent);
        } else {
          apn[node.tagName] = node.textContent || node.getAttribute('type');
        }
        node = node.nextElementSibling;
      }
      if (!usageFilter || apn.usage === usageFilter) {
        found.push(apn);
      }
      res = result.iterateNext();
    }

    return found;
  }

  // update APN fields
  function updateAPNList(apnItems) {
    var apnList = document.getElementById('apnSettings-list');
    var lastItem = apnList.lastElementChild;

    // helper
    function rilData(name) {
      var selector = 'input[data-setting="ril.data.' + name + '"]';
      return document.querySelector(selector);
    }

    // create a button to apply <apn> data to the current fields
    function createAPNItem(item) {
      // create an <input type="radio"> element
      var input = document.createElement('input');
      input.type = 'radio';
      input.name = 'APN.name';
      input.value = item.name || item.id;
      input.onclick = function fillAPNData() {
        rilData('apn').value = item.id;
        rilData('user').value = item.username;
        rilData('passwd').value = item.password;
      };

      // include the radio button element in a list item
      var span = document.createElement('span');
      var label = document.createElement('label');
      label.appendChild(input);
      label.appendChild(span);
      var a = document.createElement('a');
      a.textContent = item.name || item.id;
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

    // find the current APN
    var settings = Settings.mozSettings;
    if (settings && !gUserChosenAPN) {
      var radios = apnList.querySelectorAll('input[type="radio"]');
      var key = 'APN.name';
      var request = settings.createLock().get(key);
      request.onsuccess = function() {
        var found = false;
        if (request.result[key] != undefined) {
          for (var i = 0; i < radios.length; i++) {
            radios[i].checked = (request.result[key] === radios[i].value);
            found = found || radios[i].checked;
          }
        }
        if (!found) {
          lastItem.querySelector('input').checked = true;
        }
      };
    }

    // set current APN to 'custom' on user modification
    document.getElementById('apnSettings').onchange = function onChange(event) {
      gUserChosenAPN = true;
      if (event.target.type == 'text') {
        var lastInput = lastItem.querySelector('input');
        lastInput.checked = true;
        // send a 'change' event to update the related mozSetting
        var evtObject = document.createEvent('Event');
        evtObject.initEvent('change', true, false);
        lastInput.dispatchEvent(evtObject);
      }
    };
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

  // load the APN database
  var xhr = new XMLHttpRequest();
  xhr.open('GET', APN_FILE, true);
  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4 && (xhr.status == 200 || xhr.status === 0)) {
      updateAPNList(queryAPN(xhr.responseXML, 'internet'));
    }
  };
  xhr.send();

  // update network information when the data connection has changed
  function updateConnection() {
    var data = gMobileConnection.data ? gMobileConnection.data.network : null;
    if (!data || !data.mcc) {
      console.warn('GSM data network could not be found');
    }

    // display data carrier name
    var name = data ? (data.shortName || data.longName) : '';
    document.getElementById('data-desc').textContent = name;
    document.getElementById('dataNetwork-desc').textContent = name;

    // force data connection to restart if changes are validated
    apnSettings.querySelector('button[type=submit]').onclick =
        restartDataConnection;
  }

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
      displayDataRoamingMessage(req.result[dataRoamingSetting]);
    };
  } else {
    document.getElementById('dataRoaming-expl').hidden = true;
  }

  // initialize data settings
  gMobileConnection.addEventListener('datachange', updateConnection);
  updateConnection();
});

