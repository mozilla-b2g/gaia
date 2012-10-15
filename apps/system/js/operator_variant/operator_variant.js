/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function OperatorVariant() {
  var gNetwork = null;
  var cset = null;

  // Ensure Home Network Identity data.
  function ensureHNI() {
    var iccInfo = mobileConnection.iccInfo;
    if (!iccInfo) {
      return;
    }

    if (gNetwork &&
        gNetwork.mcc == iccInfo.mcc &&
        gNetwork.mnc == iccInfo.mnc) {
      return;
    }

    gNetwork = {};
    gNetwork.mcc = iccInfo.mcc;
    gNetwork.mnc = iccInfo.mnc;
    applyOperatorVariantSettings();
  };

  function handleSettingsReady(key, value) {
    cset[key] = value;
    ensureHNI();
    applyOperatorVariantSettings();
  };

  function applyOperatorVariantSettings() {
    if (!cset['operatorvariant.mcc'] ||
        !cset['operatorvariant.mnc']) {
      return;
    }
    if (gNetwork.mcc == 0 && gNetwork.mnc == 0) {
      return;
    }
    if ((gNetwork.mcc == cset['operatorvariant.mcc']) &&
        (gNetwork.mnc == cset['operatorvariant.mnc'])) {
      return;
    }

    cset['operatorvariant.mnc'] = gNetwork.mnc;
    cset['operatorvariant.mcc'] = gNetwork.mcc;
    retrieveOperatorVariantSettings();
    storeSettings();
  };

  function retrieveOperatorVariantSettings() {
    var OPERATOR_VARIANT_FILE = 'serviceproviders.xml';

    var xhr = new XMLHttpRequest();
    xhr.open('GET', OPERATOR_VARIANT_FILE, false);
    xhr.send();

    // Set specific operator settings. Add them here.

    // At the moment we set voicemail number to be used for the dialer app
    // if it's not in the ICC card.
    var voicemailResult = querySettings(xhr.responseXML,
                                        cset['operatorvariant.mcc'],
                                        cset['operatorvariant.mnc'],
                                        'voicemail');
    var voicemailNode = voicemailResult.iterateNext();
    if (!voicemailNode) {
      return;
    }
    cset['ro.moz.ril.iccmbdn'] = voicemailNode.textContent;
  };

  function querySettings(document, mcc, mnc, setting) {
    var query = '//gsm[network-id' +
        '[@mcc=' + mcc + '][@mnc=' + mnc + ']' +
        ']/' + setting;
    var xpe = new XPathEvaluator();
    var nsResolver = xpe.createNSResolver(document);
    return xpe.evaluate(query, document, nsResolver, 0, null);
  };

  function storeSettings() {
    var transaction = settings.createLock();
    transaction.set(cset);
  };

  function onerrorRequest() {
  };

  var settings = window.navigator.mozSettings;
  if (!settings) {
    return;
  }
  var mobileConnection = window.navigator.mozMobileConnection;
  if (!mobileConnection) {
    return;
  }

  cset = {};
  var transaction = settings.createLock();

  var mcc_request = transaction.get('operatorvariant.mcc');
  mcc_request.onsuccess = function() {
    var value = -1;
    if (mcc_request.result['operatorvariant.mcc']) {
      value = mcc_request.result['operatorvariant.mcc'];
    }
    handleSettingsReady('operatorvariant.mcc', value);
  };
  mcc_request.onerror = onerrorRequest;

  var mnc_request = transaction.get('operatorvariant.mnc');
  mnc_request.onsuccess = function() {
    var value = -1;
    if (mnc_request.result['operatorvariant.mnc']) {
      value = mnc_request.result['operatorvariant.mnc'];
    }
    handleSettingsReady('operatorvariant.mnc', value);
  };
  mnc_request.onerror = onerrorRequest;

  mobileConnection.addEventListener('iccinfochange', ensureHNI);
})();
