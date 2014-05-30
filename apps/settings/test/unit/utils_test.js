/* global suiteSetup, suite, suiteTeardown, window, navigator,
 MockDsdsSettings, getIccByIndex, MockIccManager, MockL10n */

'use strict';

require('/apps/settings/test/unit/mock_dsds_settings.js');
require('/shared/test/unit/mocks/mock_iccmanager.js');
require('/apps/settings/test/unit/mock_l10n.js');

suite('Utils', function() {
  var realDsDsSettings, realMozMobileConnections, realMozIccManager, realL10n;

  suiteSetup(function(done) {
    realDsDsSettings = window.DsdsSettings;
    window.DsdsSettings = MockDsdsSettings;

    realMozIccManager = navigator.mozIccManager;
    navigator.mozIccManager = new MockIccManager();

    realMozMobileConnections = navigator.mozMobileConnections;
    navigator.mozMobileConnections = [
      {iccId: 'icc1'},
      {iccId: 'icc2'},
      {iccId: 'icc3'},
      {iccId: 'icc4'}
    ];

    realL10n = window.navigator.mozL10n;
    window.navigator.mozL10n = MockL10n;

    requireApp('settings/js/utils.js', done);
  });

  suiteTeardown(function() {
    window.DsdsSettings = realDsDsSettings;
    window.navigator.mozL10n = realL10n;
    navigator.mozIccManager = realMozIccManager;
    navigator.mozMobileConnections = realMozMobileConnections;
  });

  suite(' > getIccByIndex', function() {
    test('check that index parameter is taken into account', function() {
      var result = getIccByIndex(1);

      assert.equal('icc2', result.iccInfo.iccid);
    });

    test('check that index parameter is chosen by default', function() {
      var result = getIccByIndex();

      // the default index for MockDsdsSettings is 2
      assert.equal('icc3', result.iccInfo.iccid);
    });

    test('check that it returns undefined if index doesn\'t exist', function() {
      var result = getIccByIndex(4);

      assert.equal(undefined, result);
    });
  });
});
