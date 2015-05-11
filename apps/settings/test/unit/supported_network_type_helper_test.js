/* global SupportedNetworkTypeHelper */
'use strict';

requireApp('settings/js/supported_network_type_helper.js');

suite('SupportedNetworkTypeHelper', function() {
  var hardwareSupportedTypes = ['gsm', 'wcdma', 'cdma', 'evdo', 'lte'];

  suite('single hardware support type', function() {
    suite('should have correct support value', function() {
      hardwareSupportedTypes.forEach(function(hardwareSupportedType) {
        test(hardwareSupportedType, function() {
          var helper = SupportedNetworkTypeHelper([hardwareSupportedType]);
          hardwareSupportedTypes.forEach(function(targetType) {
            assert.equal(helper[targetType],
              hardwareSupportedType === targetType);
          });
        });
      });
    });

    suite('networkTypes', function() {
      hardwareSupportedTypes.forEach(function(hardwareSupportedType) {
        test(hardwareSupportedType, function() {
          var helper = SupportedNetworkTypeHelper([hardwareSupportedType]);
          assert.deepEqual(helper.networkTypes, [hardwareSupportedType]);
        });
      });
    });

    suite('l10nIdForType()', function() {
      suiteSetup(function() {
        this.expectedl10nIds = {
          'gsm': 'operator-networkType-2G',
          'wcdma': 'operator-networkType-3G',
          'cdma': 'operator-networkType-CDMA',
          'evdo': 'operator-networkType-EVDO',
          'lte': 'operator-networkType-LTE'
        };
      });

      hardwareSupportedTypes.forEach(function(hardwareSupportedType) {
        test(hardwareSupportedType, function() {
          var helper = SupportedNetworkTypeHelper([hardwareSupportedType]);
          assert.equal(helper.l10nIdForType(hardwareSupportedType),
            this.expectedl10nIds[hardwareSupportedType]);
        });
      });
    });
  });

  suite('multiple hardware support types', function() {
    suite('networkTypes', function() {
      test('gsm, wcdma', function() {
        var helper = SupportedNetworkTypeHelper(['gsm', 'wcdma']);
        assert.deepEqual(helper.networkTypes, [
          'wcdma/gsm',
          'gsm',
          'wcdma',
          'wcdma/gsm-auto'
        ]);
      });

      test('evdo, cdma', function() {
        var helper = SupportedNetworkTypeHelper(['evdo', 'cdma']);
        assert.deepEqual(helper.networkTypes, [
          'cdma/evdo',
          'cdma',
          'evdo'
        ]);
      });

      test('gsm, wcdma, evdo, cdma', function() {
        var helper =
          SupportedNetworkTypeHelper(['gsm', 'wcdma', 'evdo', 'cdma']);
        assert.deepEqual(helper.networkTypes, [
          'wcdma/gsm',
          'gsm',
          'wcdma',
          'wcdma/gsm-auto',
          'cdma/evdo',
          'cdma',
          'evdo',
          'wcdma/gsm/cdma/evdo'
        ]);
      });

      test('gsm, wcdma, lte', function() {
        var helper = SupportedNetworkTypeHelper(['gsm', 'wcdma', 'lte']);
        assert.deepEqual(helper.networkTypes, [
          'wcdma/gsm',
          'gsm',
          'wcdma',
          'wcdma/gsm-auto',
          'lte/wcdma/gsm',
          'lte',
          'lte/wcdma'
        ]);
      });

      test('evdo, cdma, lte', function() {
        var helper = SupportedNetworkTypeHelper(['evdo', 'cdma', 'lte']);
        assert.deepEqual(helper.networkTypes, [
          'cdma/evdo',
          'cdma',
          'evdo',
          'lte/cdma/evdo',
          'lte'
        ]);
      });

      test('gsm, wcdma, evdo, cdma, lte', function() {
        var helper =
          SupportedNetworkTypeHelper(['gsm', 'wcdma', 'evdo', 'cdma', 'lte']);
        assert.deepEqual(helper.networkTypes, [
          'wcdma/gsm',
          'gsm',
          'wcdma',
          'wcdma/gsm-auto',
          'cdma/evdo',
          'cdma',
          'evdo',
          'wcdma/gsm/cdma/evdo',
          'lte/cdma/evdo',
          'lte/wcdma/gsm',
          'lte/wcdma/gsm/cdma/evdo',
          'lte',
          'lte/wcdma'
        ]);
      });
    });

    suite('l10nIdForType()', function() {
      test('gsm, wcdma', function() {
        var helper = SupportedNetworkTypeHelper(['gsm', 'wcdma']);
        assert.equal(helper.l10nIdForType('wcdma/gsm'),
          'operator-networkType-prefer3G');
        assert.equal(helper.l10nIdForType('gsm'), 'operator-networkType-2G');
        assert.equal(helper.l10nIdForType('wcdma'), 'operator-networkType-3G');
        assert.equal(helper.l10nIdForType('wcdma/gsm-auto'),
          'operator-networkType-auto');
      });

      test('evdo, cdma', function() {
        var helper = SupportedNetworkTypeHelper(['evdo', 'cdma']);
        assert.equal(helper.l10nIdForType('cdma/evdo'),
          'operator-networkType-auto');
        assert.equal(helper.l10nIdForType('cdma'), 'operator-networkType-CDMA');
        assert.equal(helper.l10nIdForType('evdo'), 'operator-networkType-EVDO');
      });

      test('gsm, wcdma, evdo, cdma', function() {
        var helper =
          SupportedNetworkTypeHelper(['gsm', 'wcdma', 'evdo', 'cdma']);
        assert.equal(helper.l10nIdForType('wcdma/gsm'),
          'operator-networkType-preferWCDMA');
        assert.equal(helper.l10nIdForType('gsm'), 'operator-networkType-GSM');
        assert.equal(helper.l10nIdForType('wcdma'),
          'operator-networkType-WCDMA');
        assert.equal(helper.l10nIdForType('wcdma/gsm-auto'),
          'operator-networkType-auto-WCDMA-GSM');
        assert.equal(helper.l10nIdForType('cdma/evdo'),
          'operator-networkType-auto-CDMA-EVDO');
        assert.equal(helper.l10nIdForType('cdma'), 'operator-networkType-CDMA');
        assert.equal(helper.l10nIdForType('evdo'), 'operator-networkType-EVDO');
        assert.equal(helper.l10nIdForType('wcdma/gsm/cdma/evdo'),
          'operator-networkType-auto');
      });

      test('gsm, wcdma, lte', function() {
        var helper = SupportedNetworkTypeHelper(['gsm', 'wcdma', 'lte']);
        assert.equal(helper.l10nIdForType('wcdma/gsm'),
          'operator-networkType-prefer3G');
        assert.equal(helper.l10nIdForType('gsm'), 'operator-networkType-2G');
        assert.equal(helper.l10nIdForType('wcdma'),
          'operator-networkType-3G');
        assert.equal(helper.l10nIdForType('wcdma/gsm-auto'),
          'operator-networkType-auto-2G-3G');
        assert.equal(helper.l10nIdForType('lte'), 'operator-networkType-LTE');
        assert.equal(helper.l10nIdForType('lte/wcdma/gsm'),
          'operator-networkType-auto');
        assert.equal(helper.l10nIdForType('lte/wcdma'),
          'operator-networkType-auto-3G-4G');
      });

      test('evdo, cdma, lte', function() {
        var helper = SupportedNetworkTypeHelper(['evdo', 'cdma', 'lte']);
        assert.equal(helper.l10nIdForType('cdma/evdo'),
          'operator-networkType-auto-CDMA-EVDO');
        assert.equal(helper.l10nIdForType('cdma'), 'operator-networkType-CDMA');
        assert.equal(helper.l10nIdForType('evdo'),
          'operator-networkType-EVDO');
        assert.equal(helper.l10nIdForType('lte'), 'operator-networkType-LTE');
        assert.equal(helper.l10nIdForType('lte/cdma/evdo'),
          'operator-networkType-auto');
      });

      test('gsm, wcdma, evdo, cdma, lte', function() {
        var helper =
          SupportedNetworkTypeHelper(['gsm', 'wcdma', 'evdo', 'cdma', 'lte']);
        assert.equal(helper.l10nIdForType('wcdma/gsm'),
          'operator-networkType-preferWCDMA');
        assert.equal(helper.l10nIdForType('gsm'), 'operator-networkType-GSM');
        assert.equal(helper.l10nIdForType('wcdma'),
          'operator-networkType-WCDMA');
        assert.equal(helper.l10nIdForType('wcdma/gsm-auto'),
          'operator-networkType-auto-WCDMA-GSM');
        assert.equal(helper.l10nIdForType('cdma/evdo'),
          'operator-networkType-auto-CDMA-EVDO');
        assert.equal(helper.l10nIdForType('cdma'), 'operator-networkType-CDMA');
        assert.equal(helper.l10nIdForType('evdo'), 'operator-networkType-EVDO');
        assert.equal(helper.l10nIdForType('wcdma/gsm/cdma/evdo'),
          'operator-networkType-auto-WCDMA-GSM-CDMA-EVDO');
        assert.equal(helper.l10nIdForType('lte'),
          'operator-networkType-LTE');
        assert.equal(helper.l10nIdForType('lte/wcdma'),
          'operator-networkType-auto-LTE-WCDMA');
        assert.equal(helper.l10nIdForType('lte/cdma/evdo'),
          'operator-networkType-auto-LTE-CDMA-EVDO');
        assert.equal(helper.l10nIdForType('lte/wcdma/gsm'),
          'operator-networkType-auto-LTE-WCDMA-GSM');
        assert.equal(helper.l10nIdForType('lte/wcdma/gsm/cdma/evdo'),
          'operator-networkType-auto');
      });
    });
  });
});
