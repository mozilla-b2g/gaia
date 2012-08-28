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

// handle Data settings
window.addEventListener('localized', function getCarrierSettings(evt) {
  var APN_FILE = 'serviceproviders.xml';
  var gAPNDocument;
  var gNetwork;

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

  // create a button to apply <apn> data to the current fields
  function createAPNItem(item) {
    function getFieldValue(name) {
      var selector = 'input[data-setting="ril.data.' + name + '"]';
      return document.querySelector(selector).value;
    }
    function setFieldValue(name, value) {
      var selector = 'input[data-setting="ril.data.' + name + '"]';
      document.querySelector(selector).value = value || '';
    }

    var checked = (item.id == getFieldValue('apn') &&
        item.username == getFieldValue('user') &&
        item.password == getFieldValue('passwd'));

    var input = document.createElement('input');
    input.type = 'radio';
    input.name = 'APN.name';
    input.value = item.name || item.id;
    input.checked = checked;
    input.onclick = function fillAPNData() {
      setFieldValue('apn', item.id);
      setFieldValue('user', item.username);
      setFieldValue('passwd', item.password);
    };

    var span = document.createElement('span');
    var label = document.createElement('label');
    label.appendChild(input);
    label.appendChild(span);
    var a = document.createElement('a');
    a.textContent = item.name || item.id;
    var li = document.createElement('li');
    li.appendChild(label);
    li.appendChild(a);

    li.checked = checked;
    return li;
  }

  // update APN fields
  function refreshAPNList() {
    if (!gNetwork)
      return;

    // empty the APN list
    var apnList = document.getElementById('apnSettings-list');
    var lastItem = apnList.lastElementChild;
    while (lastItem.previousElementSibling) {
      apnList.removeChild(apnList.firstElementChild);
    }

    // load the APN database
    if (!gAPNDocument) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', APN_FILE, false); // synchronous (boo!)
      xhr.send();
      gAPNDocument = xhr.responseXML;
    }

    // fill the APN list
    var checked = false; // is one item checked?
    var results = queryAPN(gAPNDocument,
        gNetwork.mcc, gNetwork.mnc, 'internet');
    for (var i = 0; i < results.length; i++) {
      var item = createAPNItem(results[i]);
      checked = checked || item.checked;
      apnList.insertBefore(item, lastItem);
    }

    // display the "Advanced Settings" section when necessary
    var input = lastItem.querySelector('input');
    function showManualSettings() {
      document.getElementById('apnSettings-manual').style.display =
          input.checked ? 'block' : 'none';
    }
    if (!checked) {
      input.checked = true;
      showManualSettings();
    }
    input.onchange = showManualSettings;
  };

  // update `gNetwork' when the data connection has changed
  function updateConnection() {
    gNetwork = gMobileConnection.data ? gMobileConnection.data.network : null;
    if (gNetwork && !gNetwork.mcc) {
      console.warn('GSM data network could not be found');
    }

    // display data carrier name
    var shortName = gNetwork ? gNetwork.shortName : '';
    document.getElementById('data-desc').textContent = shortName;
    document.getElementById('dataNetwork-desc').textContent = shortName;

    // fill the APN list
    refreshAPNList();
  }
});

