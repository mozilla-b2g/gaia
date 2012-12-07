/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

document.addEventListener('DOMContentLoaded', function onload() {
  var DEBUG = false;

  var OPERATOR_VARIANT_FILE = '../apn.json';
  var GNOME_DB_FILE = 'serviceproviders.xml';
  var ANDROID_DB_FILE = 'apns_conf.xml';
  var LOCAL_ANDROID_DB_FILE = 'apns_conf-local.xml';
  var OPERATOR_VARIANT_DB_FILE = 'operator-variant.xml';

  var gGnomeDB = null;
  var gAndroidDB = null;
  var gOperatorVariantDB = null;


  /**
   * XML helpers: load & query XML databases
   */

  function loadXML(url) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send();
    return xhr.responseXML;
  }

  function queryXML(xmlDocument, query) {
    var xpe = new XPathEvaluator();
    var nsResolver = xpe.createNSResolver(xmlDocument);
    return xpe.evaluate(query, xmlDocument, nsResolver, 0, null);
  }


  /**
   * Merge the Android and Gnome APN and the Operator Variant databases
   */

  function queryAndroidDB(mcc, mnc) {
    var query = '//apn';
    if (mcc) {
      query += '[@mcc=' + mcc + ']'; // Mobile Country Code
    }
    if (mnc) {
      query += '[@mnc=' + mnc + ']'; // Mobile Network Code
    }

    var result = queryXML(gAndroidDB, query);
    var res = result.iterateNext();
    var found = [];

    while (res) { // turn each resulting XML element into a JS object
      var apn = {};
      for (var i = 0; i < res.attributes.length; i++) {
        var name = res.attributes[i].name;
        var value = res.attributes[i].value;
        if (name == 'type') { // array of comma-separated values
          apn.type = value.split(',');
        } else { // all other attributes are plain strings
          apn[name] = value;
        }
      }
      found.push(apn);
      res = result.iterateNext();
    }

    return found;
  }

  function queryGnomeDB(mcc, mnc, setting) {
    var query = '//gsm[network-id' + '[@mcc=' + mcc + '][@mnc=' + mnc + ']' +
        ']/' + setting;
    var result = queryXML(gGnomeDB, query);
    var node = result.iterateNext();
    return node ? node.textContent : '';
  }

  function queryOperatorVariantDB(mcc, mnc) {
    var query = '//operator' + '[@mcc=' + mcc + '][@mnc=' + mnc + ']';
    var result = queryXML(gOperatorVariantDB, query);
    var res = result.iterateNext();
    var found = [];

    while (res) { // turn each resulting XML element into a JS object
      var operatorSettings = {};
      for (var i = 0; i < res.attributes.length; i++) {
        var name = res.attributes[i].name;
        var value = res.attributes[i].value;
        operatorSettings[name] = value;
      }
      found.push(operatorSettings);
      res = result.iterateNext();
    }

    return found.length ? found[0] : null;
  }

  function mergeDBs() {
    var apn = {};

    for (var mcc = 1; mcc < 999; mcc++) {
      var country = {};
      var result = queryAndroidDB(mcc);
 
     if (result && result.length) {
        result.sort(function(a, b) {
          return parseInt(result.mnc, 10) < parseInt(result.mnc, 10);
        });
        for (var i = 0; i < result.length; i++) {
          var mnc = parseInt(result[i].mnc, 10);

          var operatorVariantSettings = {};
          var voicemail = queryGnomeDB(mcc, mnc, 'voicemail');
          if (voicemail) {
            operatorVariantSettings.voicemail = voicemail;
            if (DEBUG) {
              console.log(operatorVariantSettings.voicemail + ': ' + voicemail);
            }
          }
          var otherSettings = queryOperatorVariantDB(mcc, mnc);
          if (otherSettings) {
            if (DEBUG) {
              console.log("Other operator settng: " + JSON.stringify(otherSettings));
            }
            var enableStrict7BitEncodingForSms =
              otherSettings['enableStrict7BitEncodingForSms'];
            if (enableStrict7BitEncodingForSms) {
              operatorVariantSettings.enableStrict7BitEncodingForSms =
                enableStrict7BitEncodingForSms == 'true';
            }
            var cellBroadcastSearchList =
              otherSettings['cellBroadcastSearchList'];
            if (cellBroadcastSearchList) {
              operatorVariantSettings.cellBroadcastSearchList =
                cellBroadcastSearchList;
            }
          }

          delete(result[i].mcc);
          delete(result[i].mnc);
          if (country[mnc]) {
            if (DEBUG) { // warn about the duplicate (mcc, mnc) tuple
              if (country[mnc].length == 1) {
                console.log('duplicate mcc/mnc: ' + mcc + '/' + mnc);
                console.log(' - ' + country[mnc][0].carrier);
              }
              console.log(' - ' + result[i].carrier);
            }
            country[mnc].push(result[i]);
          } else {
            country[mnc] = [result[i]];
            if (voicemail || otherSettings || cellBroadcastSearchList) {
              operatorVariantSettings.type = [];
              operatorVariantSettings.type.push('operatorvariant');
              country[mnc].push(operatorVariantSettings);
            }
          }
        }
        apn[mcc] = country;
      }
    }

    return apn;
  }


  /**
   * User Interface
   */

  var gAPN;
  var apnPrefNames = {
    'default': {
      'ril.data.carrier': 'carrier',
      'ril.data.apn': 'apn',
      'ril.data.user': 'user',
      'ril.data.passwd': 'password',
      'ril.data.httpProxyHost': 'proxy',
      'ril.data.httpProxyPort': 'port'
    },
    'supl': {
      'ril.supl.carrier': 'carrier',
      'ril.supl.apn': 'apn',
      'ril.supl.user': 'user',
      'ril.supl.passwd': 'password',
      'ril.supl.httpProxyHost': 'proxy',
      'ril.supl.httpProxyPort': 'port'
    },
    'mms': {
      'ril.mms.carrier': 'carrier',
      'ril.mms.apn': 'apn',
      'ril.mms.user': 'user',
      'ril.mms.passwd': 'password',
      'ril.mms.httpProxyHost': 'proxy',
      'ril.mms.httpProxyPort': 'port',
      'ril.mms.mmsc': 'mmsc',
      'ril.mms.mmsproxy': 'mmsproxy',
      'ril.mms.mmsport': 'mmsport'
    },
    'operatorvariant': {
      'ril.iccInfo.mbdn': 'voicemail',
      'ril.sms.strict7BitEncoding.enabled': 'enableStrict7BitEncodingForSms',
      'ril.cellbroadcast.searchlist': 'cellBroadcastSearchList'
    }
  };

  var booleanPrefNames = [
    'ril.sms.strict7BitEncoding.enabled'
  ];

  function loadDB(output, callback) {
    output.textContent = '\n loading database...';
    var xhr = new XMLHttpRequest();
    xhr.open('GET', OPERATOR_VARIANT_FILE, true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4) {
        if (xhr.status == 200 || xhr.status === 0) {
          // the JSON database is already available -- we don't use
          // xhr.responseType = 'json' to be compatible with Chrome... sigh.
          gAPN = JSON.parse(xhr.responseText);
        } else {
          // the JSON database is not available, merge the three XML databases
          output.textContent = '\n merging databases, this takes a while...';
          gAndroidDB = loadXML(ANDROID_DB_FILE);
          // First merge the local DB
          var localAndroidDB = loadXML(LOCAL_ANDROID_DB_FILE);
          var localApns = localAndroidDB.documentElement.getElementsByTagName("apn");
          for (var i = 0; i < localApns.length; ++i) {
            gAndroidDB.documentElement.appendChild(localApns[i]);
          }
          // Then the Gnome DB
          gGnomeDB = loadXML(GNOME_DB_FILE);
          gOperatorVariantDB = loadXML(OPERATOR_VARIANT_DB_FILE);
          gAPN = mergeDBs();
        }
        output.textContent = DEBUG ?
          JSON.stringify(gAPN, true, 2) :
          JSON.stringify(gAPN, true, 0)
              .replace(/("[0-9]+"):{/g, '\n$1: {')
              .replace(/("[0-9]+"):\[/g, '\n  $1: [')
              .replace(/},\n/g, '\n},\n')
              .replace(/\[{/g, '[\n    {')
              .replace(/},{/g, '},\n    {')
              .replace(/}(],?)/g, '}\n  $1')
              .replace(/]}}$/, ']\n}\n}');
        callback();
      }
    };
    xhr.send();
  }

  function update() {
    var selection = document.getElementById('selection');
    var mcc = parseInt(document.querySelector('input[name=mcc]').value, 10);
    var mnc = parseInt(document.querySelector('input[name=mnc]').value, 10);
    var res = gAPN[mcc] ? (gAPN[mcc][mnc] || []) : [];
    selection.textContent = JSON.stringify(res, true, 2);

    var preferences = document.getElementById('preferences');
    var prefs = {};
    for (var type in apnPrefNames) {
      var apn = {};
      for (var i = 0; i < res.length; i++) {
        if (res[i].type.indexOf(type) != -1) {
          apn = res[i];
          break;
        }
      }
      var prefNames = apnPrefNames[type];
      for (var key in prefNames) {
        var name = apnPrefNames[type][key];
        if (booleanPrefNames.indexOf(key) != -1) {
          prefs[key] = apn[name] || false;
        } else {
          prefs[key] = apn[name] || '';
        }
      }
    }
    preferences.textContent = JSON.stringify(prefs, true, 2);
  }

  document.querySelector('form').oninput = update;
  loadDB(document.querySelector('textarea'), update);
});

