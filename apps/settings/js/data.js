/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
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
  var fakeNetwork = { shortName: 'Fake Orange', mcc: 208, mnc: 1 };

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
    get data() {
      return initialized ? { network: fakeNetwork } : null;
    }
  };
})(this);

// handle data settings
window.addEventListener('load', function getCarrierSettings() {
  var APN_FILE = 'serviceproviders.xml';
  var gUserChosenAPN = false;
  var gAPNDocument = null;
  var gNetworkID = { mcc: 0, mnc: 0 };
  var gNetwork = null;

  // initialize data settings
  gMobileConnection.addEventListener('datachange', updateConnection);
  updateConnection();

  // query <apn> elements matching the mcc/mnc arguments
  function queryAPN(apnDocument, mcc, mnc, usageFilter) {
    var query = '//gsm[network-id[@mcc=' + mcc + '][@mnc=' + mnc + ']]/apn';
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

  // update APN fields
  function checkAPNDataBase() {
    if (!gNetwork)
      return;

    function refreshAPNList() {
      var results = queryAPN(gAPNDocument,
          gNetwork.mcc, gNetwork.mnc, 'internet');

      // empty the APN list
      var apnList = document.getElementById('apnSettings-list');
      var lastItem = apnList.lastElementChild;
      while (lastItem.previousElementSibling) {
        apnList.removeChild(apnList.firstElementChild);
      }

      // fill the APN list
      for (var i = 0; i < results.length; i++) {
        apnList.insertBefore(createAPNItem(results[i]), lastItem);
      }

      // find the current APN
      var found = false;
      var settings = window.navigator.mozSettings;
      if (settings && !gUserChosenAPN) {
        var radios = apnList.querySelectorAll('input[type="radio"]');
        var key = 'APN.name';
        var request = settings.getLock().get(key);
        request.onsuccess = function() {
          if (request.result[key] != undefined) {
            for (var i = 0; i < radios.length; i++) {
              radios[i].checked = (request.result[key] === radios[i].value);
              found = found || radios[i].checked;
            }
          }
        };
      }
      if (!found) {
        lastItem.querySelector('input').checked = true;
      }

      // set currrent APN to 'custom' on user modification
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

    // load the APN database if required
    if (!gAPNDocument) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', APN_FILE, true);
      xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 && (xhr.status == 200 || xhr.status === 0)) {
          gAPNDocument = xhr.responseXML;
          refreshAPNList();
        }
      };
      xhr.send();
    } else {
      refreshAPNList();
    }
  }

  // update data connection by toggling it off and on again
  function refreshDataConnection() {
    var settings = window.navigator.mozSettings;
    if (!settings)
      return;

    var key = 'ril.data.enabled';
    function setDataState(state) {
      var cset = {};
      cset[key] = state;
      settings.getLock().set(cset);
    }

    var request = settings.getLock().get(key);
    request.onsuccess = function() {
      if (request.result[key]) {
        setDataState(false);    // turn data off
        setTimeout(function() { // turn data back on
          setDataState(true);
        }, 2500); // restart data connection in 2.5s
      }
    };
  }

  // update `gNetwork' when the data connection has changed
  function updateConnection() {
    gNetwork = gMobileConnection.data ? gMobileConnection.data.network : null;
    if (gNetwork && !gNetwork.mcc) {
      console.warn('GSM data network could not be found');
    }

    // new data network found?
    if (gNetwork.mcc == gNetworkID.mcc && gNetwork.mnc == gNetworkID.mnc)
      return;

    gNetworkID = {
      mcc: gNetwork.mcc,
      mnc: gNetwork.mnc
    };

    // display data carrier name
    var shortName = gNetwork ? gNetwork.shortName : '';
    document.getElementById('data-desc').textContent = shortName;
    document.getElementById('dataNetwork-desc').textContent = shortName;

    // fill the APN list
    checkAPNDataBase();

    // toggle advanced settings when required
    var advSettings = document.getElementById('apnSettings-advanced');
    advSettings.querySelector('h3').onclick = function toggle() {
      advSettings.classList.toggle('collapsed');
    }
    var resetBtn = document.querySelector('#apnSettings button[type=reset]');
    resetBtn.onclick = function onSubmit() {
      advSettings.classList.add('collapsed');
    }
    var submitBtn = document.querySelector('#apnSettings button[type=submit]');
    submitBtn.onclick = function onSubmit() {
      advSettings.classList.add('collapsed');
      refreshDataConnection(); // force data connection to restart
    }
  }
});

