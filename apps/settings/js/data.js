/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

window.addEventListener('localized', function getCarrierSettings(evt) {
  var DEBUG = false;

  // display data carrier name
  // TODO: set an event listener if mozMobileConnection isn't ready yet
  var dataConnection = navigator.mozMobileConnection.data;
  document.getElementById('data-desc').textContent = dataConnection ?
      dataConnection.network.shortName : '?';

  // query <apn> elements matching the mcc/mnc arguments
  function queryAPN(apnDocument, mcc, mnc) {
    var query = '//gsm[network-id[@mcc=' + mcc + '][@mnc=' + mnc + ']]/apn';
    var xpe = new XPathEvaluator();
    var nsResolver = xpe.createNSResolver(apnDocument);
    var result = xpe.evaluate(query, apnDocument, nsResolver, 0, null);

    var found = [];
    var res = result.iterateNext();
    while (res) { // turn each resulting XML element into a JS object
      var apn = {
        name: res.getAttribute('value'),
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
      found.push(apn);
      res = result.iterateNext();
    }

    return found;
  }

  // update APN fields
  document.getElementById('autoAPN').onclick = function autoAPN() {
    try { // get MCC/MNC values
      var dataNetwork = navigator.mozMobileConnection.data.network;
      var mcc = dataNetwork.mcc;
      var mnc = dataNetwork.mnc;
    } catch (e) {
      return;
    }

    if (DEBUG) { // display MCC/MNC in the UI
      var li = document.createElement('li');
      li.textContent = 'mcc: ' + mcc + ' / mnc: ' + mnc;
      this.parentNode.parentNode.appendChild(li);
    }

    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'serviceproviders.xml', false);
    xhr.send();

    function getField(name) {
      return document.querySelector('input[name="ril.data.' + name + '"]');
    }
    function setFieldValue(name, value) {
      var input = document.querySelector('input[name="ril.data.' + name + '"]');
      input.value = value || '';
    }

    var results = queryAPN(xhr.responseXML, mcc, mnc);
    if (results && results.length) {
      var res = results[0];
      getField('apn').value = res.name || '';
      getField('user').value = res.username || '';
      getField('passwd').value = res.password || '';
    }
  };
});

