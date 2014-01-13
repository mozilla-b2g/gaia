/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global MockNavigatorSettings, StoreProvisioning */

'use strict';

requireApp('wappush/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('wappush/js/store.js');

suite('StoreProvisioning >', function() {
  var realSettings;

  suiteSetup(function() {
    realSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
    MockNavigatorSettings.mSettings['operatorvariant.mcc'] = ['214', '000'];
    MockNavigatorSettings.mSettings['operatorvariant.mnc'] = ['07', '00'];
  });

  suiteTeardown(function() {
    navigator.mozSettings = realSettings;
    realSettings = null;
  });

  suite('StoreProvisioning.getMccMncCodes()', function() {
    test('Get MCC code', function() {
      StoreProvisioning.getMccMncCodes(function(mcc, mnc) {
        assert.equal(mcc, '214');
      });
    });
    test('Get MNC code', function() {
      StoreProvisioning.getMccMncCodes(function(mcc, mnc) {
        assert.equal(mnc, '07');
      });
    });
  });

  suite('StoreProvisioning.provision()', function() {
    setup(function() {
      MockNavigatorSettings.mSettings['ril.data.cp.apns'] = '';
    });

    test('Add APN: Telefonica DEFAULT type', function() {
      var apns = [{
        carrier: 'Movistar',
        apn: 'telefonica.es',
        user: 'telefonica',
        password: 'telefonica',
        type: ['default']
      }];
      StoreProvisioning.provision(apns,
        function() {
          assert.lengthOf(
          MockNavigatorSettings.mSettings['ril.data.cp.apns']['214']['07'], 1
          );
      });
    });
  });

  suite('StoreProvisioning.provision()', function() {
    setup(function() {
      MockNavigatorSettings.mSettings['ril.data.cp.apns'] = {};
      MockNavigatorSettings.mSettings['ril.data.cp.apns']['214'] = {};
      MockNavigatorSettings.mSettings['ril.data.cp.apns']['214']['07'] = [{
        carrier: 'Movistar',
        apn: 'telefonica.es',
        user: 'telefonica',
        password: 'telefonica',
        type: ['default']
      }];
    });

    test('Add APN: Telefonica MMS type', function() {
      var apns = [{
        carrier: 'Movistar MMS',
        apn: 'telefonica.es',
        user: 'telefonica',
        password: 'telefonica',
        type: ['mms']
      }];
      StoreProvisioning.provision(apns,
        function() {
          assert.lengthOf(
          MockNavigatorSettings.mSettings['ril.data.cp.apns']['214']['07'], 2
          );
      });
    });
  });
});
