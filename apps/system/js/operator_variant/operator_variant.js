/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// The operator variant logic loads a set of settings that apply to the
// susbcriber's carrier on boot.
(function OperatorVariant() {
  var gNetwork = null;
  var cset = null;

  // Ensures Home Network Identity data. Mobile Network Code (MNC) is used in
  // combination with a Mobile Country Code (MCC) (also known as a "MCC/MNC
  // tuple") to uniquely identify the subscriber's operator/carrier. We read
  // them from the ICC card.
  function ensureHNI() {
    var iccInfoData = navigator.mozMobileConnection &&
                      navigator.mozMobileConnection.iccInfo;
    if (!iccInfoData) {
      return;
    }
    var network = gNetwork;
    if (iccInfoData.mcc == network.mcc && iccInfoData.mnc == network.mnc) {
      return;
    }

    gNetwork.mcc = iccInfoData.mcc;
    gNetwork.mnc = iccInfoData.mnc;

    applyOperatorVariantSettings();
  };

  function handleSettingsReady(key, value) {
    cset[key] = value;
    ensureHNI();
    applyOperatorVariantSettings();
  };

  // Load the setting values that apply to the subscriber's carrier.
  function applyOperatorVariantSettings() {
    if (!cset['operatorvariant.mcc'] ||
        !cset['operatorvariant.mnc']) {
      return;
    }
    if (gNetwork.mcc == 0 && gNetwork.mnc == 0) {
      return;
    }
    // Bails out if the setting DB is already storing the setting values for
    // that subscriber.
    if ((gNetwork.mcc == cset['operatorvariant.mcc']) &&
        (gNetwork.mnc == cset['operatorvariant.mnc'])) {
      return;
    }

    // If the MCC/MNC tuple has changed it means it's the first boot or
    // the subscriber's carrier has changed.
    cset['operatorvariant.mcc'] = gNetwork.mcc;
    cset['operatorvariant.mnc'] = gNetwork.mnc;
    loadOperatorVariantSettings();
  };

  function loadOperatorVariantSettings() {
    var OPERATOR_VARIANT_FILE = 'resources/operator-variant.xml';

    var xhr = new XMLHttpRequest();
    xhr.open('GET', OPERATOR_VARIANT_FILE, true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4 && (xhr.status == 200 || xhr.status === 0)) {
        // Load specific operator settings. Add them here.
        var result = querySettings(xhr.responseXML,
                                   cset['operatorvariant.mcc'],
                                   cset['operatorvariant.mnc']);
        if (!result.length) {
          return;
        }

        // Load voicemail number to be used for the dialer app
        // if it's not in the ICC card.
        var voicemail = result[0].getAttribute('voicemail');
        cset['ro.moz.iccInfo.mbdn'] = "";
        if (voicemail) {
          cset['ro.moz.iccInfo.mbdn'] = voicemail;
        }

        // Load the flag to determine whether to enable Latin characters
        // replacement with corresponding ones in GSM SMS 7-bit default
        // alphabet.
        var enableStrict7BitEncodingForSms =
          result[0].getAttribute('enableStrict7BitEncodingForSms');
        cset['ril.sms.strict7BitEncoding.enabled'] = false;
        if (enableStrict7BitEncodingForSms) {
          cset['ril.sms.strict7BitEncoding.enabled'] =
            enableStrict7BitEncodingForSms == 'true';
        }

        var transaction = settings.createLock();
        transaction.set(cset);
      }
    };
    xhr.send(null);
  };

  // Queries the setting values that apply to the subscriber's carrier.
  function querySettings(document, mcc, mnc) {
    var query = '//operator' + '[@mcc=' + mcc + '][@mnc=' + mnc + ']';
    var xpe = new XPathEvaluator();
    var nsResolver = xpe.createNSResolver(document);
    var result = xpe.evaluate(query, document, nsResolver, 0, null);
    var r, found = [];
    while (r = result.iterateNext()) {
      found.push(r);
    }
    return found;
  };

  function onerrorRequest() {
  };

  var settings = navigator.mozSettings;
  if (!settings) {
    return;
  }
  var mobileConnection = navigator.mozMobileConnection;
  if (!mobileConnection) {
    return;
  }
  var iccInfoData = navigator.mozMobileConnection &&
                    navigator.mozMobileConnection.iccInfo;
  if (!iccInfoData) {
    return;
  }

  gNetwork = {};
  gNetwork.mcc = iccInfoData.mcc;
  gNetwork.mnc = iccInfoData.mnc;

  // Read the MCC/MNC tuple from the setting DB. If it's already stored in the
  // DB it means it's not the first boot and we need to check if the
  // subscriber's carrier has changed.
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
  ensureHNI();
})();
