/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* globals loadBodyHTML, CarrierSettings, DsdsSettings, MockL10n,
           MockNavigatorSettings */

'use strict';

requireApp('settings/shared/test/unit/load_body_html_helper.js');
requireApp('settings/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('settings/js/carrier.js');
requireApp('settings/js/dsds_settings.js');
require('/shared/test/unit/mocks/mock_l10n.js');

suite('Carrier settings', function() {
  var realMozSettings;
  var realMozL10n;

  function _getHashCode(s) {
    return s.split('').reduce(
      function(a, b) {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
  }

  suiteSetup(function() {
    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    loadBodyHTML('./_carrier_data_settings.html');
  });

  suiteTeardown(function() {
    navigator.mozL10n = realMozL10n;
    navigator.mozSettings = realMozSettings;
  });

  suite('Default APNs panel, switchRadioButtons function', function() {
    var carrierNames;

    setup(function() {
      // All the carriers have the same name on purpose.
      carrierNames = ['Carrier', 'Carrier', 'Carrier'];
    });

    test('Different APNs with same name are correctly selected', function() {
      var apnPanel = document.getElementById('carrier-dataSettings');
      var apnList = apnPanel.querySelector('.apnSettings-list');

      for (var i = 0; i < carrierNames.length; i++) {
        var name = carrierNames[i];
        var s = name + i;
        var hashCode = _getHashCode(s);

        CarrierSettings.switchRadioButtons(apnList, hashCode);

        var selector = 'input[type="radio"]:checked';
        var item = apnList.querySelector(selector);
        assert.equal(hashCode, item.value);
      }
    });
  });

  suite('Preselect APN', function() {
    var APNS_KEY = 'ril.data.apnSettings';
    var apnListElement;
    var apnList;
    var preferredApnList;
    var apns;

    setup(function() {
      MockNavigatorSettings.mSettings[APNS_KEY] = '[[], []]';
      preferredApnList = [
        [{
          carrier: 'Movistar',
          apn: 'telefonica.es',
          user: 'telefonica',
          password: 'telefonica',
          proxy: '10.138.255.133',
          port: '8080',
          mmsc: 'http://mms.movistar.com',
          mmsproxy: '10.138.255.5',
          mmsport: '8080',
          authtype: 'pap',
          types: ['default']
        },
        {
          carrier: 'Movistar',
          apn: 'telefonica.es',
          user: 'telefonica',
          password: 'telefonica',
          proxy: '10.138.255.133',
          port: '8080',
          mmsc: 'http://mms.movistar.com',
          mmsproxy: '10.138.255.5',
          mmsport: '8080',
          authtype: 'pap',
          types: ['mms']
        },
        {
          carrier: 'Movistar',
          apn: 'telefonica.es',
          user: 'telefonica',
          password: 'telefonica',
          proxy: '10.138.255.133',
          port: '8080',
          mmsc: 'http://mms.movistar.com',
          mmsproxy: '10.138.255.5',
          mmsport: '8080',
          authtype: 'pap',
          types: ['supl']
        }],
        []
      ];

      apnList = [
        {
          carrier: 'Movistar',
          apn: 'telefonica.es',
          user: 'telefonica',
          password: 'telefonica',
          proxy: '10.138.255.133',
          port: '8080',
          mmsc: 'http://mms.movistar.com',
          mmsproxy: '10.138.255.5',
          mmsport: '8080',
          authtype: 'pap',
          types: ['default', 'supl', 'mms']
        },
        {
          carrier: 'Jazztel Internet',
          apn: 'jazzinternet',
          type: ['default', 'supl'],
          mvno_match_data: 'JAZZTEL',
          mvno_type: 'spn',
          _id: '566a3284-011a-11e4-aa2a-8b77e4c6317d'
      }];

      var apnPanel = document.getElementById('carrier-dataSettings');
      apnListElement = apnPanel.querySelector('.apnSettings-list');
      DsdsSettings.init();
      CarrierSettings.init();
    });

    teardown(function() {
      MockNavigatorSettings.mTeardown();
    });

    suite('Default APNs panel', function() {
      setup(function() {
        MockNavigatorSettings.mSettings[APNS_KEY] = preferredApnList;
      });

      test('Preselect Movistar w/o hash code', function(done) {
        CarrierSettings.updateApnList(apnList, 'data',
          function onUpdated() {
            var selector = 'input[type="radio"]:checked';
            var input = apnListElement.querySelector(selector);
            assert.equal(input.value, _getHashCode('Movistar0'));
            done();
        });
      });
    });

    suite('Default APNs panel', function() {
      setup(function() {
        preferredApnList[0][0].hashCode = _getHashCode('Movistar0');
        MockNavigatorSettings.mSettings[APNS_KEY] = preferredApnList;
      });

      test('Preselect Movistar with hash code', function(done) {
        CarrierSettings.updateApnList(apnList, 'data',
          function onUpdated() {
            var selector = 'input[type="radio"]:checked';
            var input = apnListElement.querySelector(selector);
            assert.equal(input.value, _getHashCode('Movistar0'));
            done();
        });
      });
    });

    suite('Default APNs panel', function() {
      setup(function() {
        preferredApnList[0][0].hashCode = _getHashCode('Movistar1');
        MockNavigatorSettings.mSettings[APNS_KEY] = preferredApnList;

        apns = [{
          carrier: 'Movistar',
          apn: 'telefonica.es',
          user: 'telefonica',
          password: 'telefonica',
          proxy: '10.138.255.133',
          port: '8080',
          mmsc: 'http://mms.movistar.com',
          mmsproxy: '10.138.255.5',
          mmsport: '8080',
          authtype: 'pap',
          types: ['default', 'supl', 'mms']
        }];
      });

      test('Preselect Movistar (second APN in the list) with hash code',
        function(done) {
          CarrierSettings.updateApnList(apns.concat(apnList), 'data',
          function onUpdated() {
            var selector = 'input[type="radio"]:checked';
            var input = apnListElement.querySelector(selector);
            assert.equal(input.value, _getHashCode('Movistar1'));
            done();
          });
      });
    });

    suite('APN with _id coming from wappush', function() {
      setup(function() {

        apns = [{
          carrier: 'Movistar',
          apn: 'telefonica.es',
          user: 'telefonica',
          password: 'telefonica',
          proxy: '10.138.255.133',
          port: '8080',
          mmsc: 'http://mms.movistar.com',
          mmsproxy: '10.138.255.5',
          mmsport: '8080',
          authtype: 'pap',
          types: ['default', 'supl', 'mms'],
          _id: '6634ed3e-0116-11e4-8bfc-9b5db80418bc'
        }];

        // Modify settings property like wappush application does, adding
        // an apn with an external id (uuid). So it can be selected when
        // there is another apn with the same name/carrier.
        preferredApnList[0][0] = apns[0];
        MockNavigatorSettings.mSettings[APNS_KEY] = preferredApnList;
      });

      test('Select Movistar (last APN in the list)',
        function(done) {
          CarrierSettings.updateApnList(apnList.concat(apns), 'data',
          function onUpdated() {
            // If the apn has no _id, first apn is selected, so check that
            // the second one is selected.
            var selector = 'input[type="radio"]:checked';
            var input = apnListElement.querySelector(selector);
            assert.equal(input.value, _getHashCode(apns[0]._id + '2'));
            done();
          });
      });
    });

  });
});
