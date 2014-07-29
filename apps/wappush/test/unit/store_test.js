/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global MockNavigatorSettings, StoreProvisioning */

'use strict';

requireApp('wappush/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('wappush/js/store.js');
require('/shared/js/uuid.js');
require('/shared/test/unit/mocks/mocks_helper.js');

var mocksHelperStoreProvisioning = new MocksHelper([
  'NavigatorSettings'
]).init();

suite('StoreProvisioning >', function() {
  var realSettings;
  mocksHelperStoreProvisioning.attachTestHelpers();

  suiteSetup(function() {
    realSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
  });

  suiteTeardown(function() {
    navigator.mozSettings = realSettings;
    realSettings = null;
  });

  setup(function() {
    MockNavigatorSettings.mSettings['operatorvariant.mcc'] = ['214', '216'];
    MockNavigatorSettings.mSettings['operatorvariant.mnc'] = ['07', '01'];
  });

  suite('StoreProvisioning.getMccMncCodes()', function() {
    test('Get SIM1 MCC code', function() {
      StoreProvisioning.getMccMncCodes(0, function(mcc, mnc) {
        assert.equal(mcc, '214');
      });
    });
    test('Get SIM1 MNC code', function() {
      StoreProvisioning.getMccMncCodes(0, function(mcc, mnc) {
        assert.equal(mnc, '07');
      });
    });
    test('Get SIM2 MCC code', function() {
      StoreProvisioning.getMccMncCodes(1, function(mcc, mnc) {
        assert.equal(mcc, '216');
      });
    });
    test('Get SIM2 MNC code', function() {
      StoreProvisioning.getMccMncCodes(1, function(mcc, mnc) {
        assert.equal(mnc, '01');
      });
    });
  });

  suite('StoreProvisioning.provision()', function() {
    setup(function() {
      MockNavigatorSettings.mSettings['ril.data.cp.apns'] = '';
      MockNavigatorSettings.mSettings['ril.data.apnSettings'] = '';
    });

    test('Add APN to SIM1: Telefonica DEFAULT type', function(done) {
      var apns = [{
        carrier: 'Movistar',
        apn: 'telefonica.es',
        user: 'telefonica',
        password: 'telefonica',
        type: ['default']
      }];
      StoreProvisioning.provision(apns, 0, function(){
        done(function() {
          assert.lengthOf(
          MockNavigatorSettings.mSettings['ril.data.cp.apns']['214']['07'], 1
          );
          assert.lengthOf(
          MockNavigatorSettings.mSettings['ril.data.apnSettings'][0], 1
          );
        });
      });
    });
    test('Add APN to SIM2: Pannon DEFAULT type', function(done) {
      var apns = [{
        carrier: 'Pannon GSM',
        apn: 'Pannon.hu',
        user: 'Pannon',
        password: 'Pannon',
        type: ['default']
      }];
      StoreProvisioning.provision(apns, 1, function() {
        done(function() {
          assert.lengthOf(
          MockNavigatorSettings.mSettings['ril.data.cp.apns']['216']['01'], 1
          );
          assert.lengthOf(
          MockNavigatorSettings.mSettings['ril.data.apnSettings'][1], 1
          );
        });
      });
    });
  });

  suite('StoreProvisioning.provision()', function() {
    setup(function() {
      MockNavigatorSettings.mSettings['ril.data.apnSettings'] = '';
      MockNavigatorSettings.mSettings['ril.data.cp.apns'] = {};
      MockNavigatorSettings.mSettings['ril.data.cp.apns']['214'] = {};
      MockNavigatorSettings.mSettings['ril.data.cp.apns']['216'] = {};
      MockNavigatorSettings.mSettings['ril.data.cp.apns']['214']['07'] = [{
        carrier: 'Movistar',
        apn: 'telefonica.es',
        user: 'telefonica',
        password: 'telefonica',
        type: ['default']
      }];
      MockNavigatorSettings.mSettings['ril.data.cp.apns']['216']['01'] = [{
        carrier: 'Pannon GSM',
        apn: 'Pannon.hu',
        user: 'Pannon',
        password: 'Pannon',
        type: ['default']
      }];
    });

    test('Add APN to SIM1: Telefonica MMS type', function(done) {
      var apns = [{
        carrier: 'Movistar MMS',
        apn: 'telefonica.es',
        user: 'telefonica',
        password: 'telefonica',
        type: ['mms']
      }];
      StoreProvisioning.provision(apns, 0, function() {
        done(function() {
          assert.lengthOf(
          MockNavigatorSettings.mSettings['ril.data.cp.apns']['214']['07'], 2
          );
          assert.lengthOf(
          MockNavigatorSettings.mSettings['ril.data.apnSettings'][0], 1
          );
        });
      });
    });
    test('Add APN to SIM2: Pannon MMS type', function(done) {
      var apns = [{
        carrier: 'Pannon GSM MMS',
        apn: 'Pannon.hu',
        user: 'Pannon',
        password: 'Pannon',
        type: ['mms']
      }];
      StoreProvisioning.provision(apns, 1, function(){
        done(function() {
          assert.lengthOf(
          MockNavigatorSettings.mSettings['ril.data.cp.apns']['216']['01'], 2
          );
          assert.lengthOf(
          MockNavigatorSettings.mSettings['ril.data.apnSettings'][1], 1
          );
        });
      });
    });
  });
});
