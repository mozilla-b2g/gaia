/* global MockL10n, MockNavigatorMozMobileConnections,
          MockNavigatorMozTelephony, AboutMoreInfo */
'use strict';

requireApp('settings/test/unit/mock_l10n.js');
requireApp('settings/test/unit/mocks_helper.js');
requireApp('settings/js/about_more_info.js');
require('/shared/test/unit/load_body_html_helper.js');
require('/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
require('/shared/test/unit/mocks/mock_navigator_moz_telephony.js');

suite('about >', function() {
  var realL10n, realMobileConnections, realTelephony;

  suiteSetup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    realMobileConnections = navigator.mozMobileConnections;
    navigator.mozMobileConnections = MockNavigatorMozMobileConnections;
    realTelephony = navigator.mozTelephony;
    navigator.mozTelephony = MockNavigatorMozTelephony;
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    realL10n = null;
    navigator.mozMobileConnections = realMobileConnections;
    realMobileConnections = null;
    navigator.mozTelephony = realTelephony;
    realTelephony = null;
  });

  setup(function() {
    loadBodyHTML('./_about_more_info.html');
  });

  teardown(function() {
    MockNavigatorMozTelephony.mTeardown();
    MockNavigatorMozMobileConnections.mTeardown();
    document.body.innerHTML = '';
  });

  suite('loadIccId >', function() {
    var deviceInfoIccIds;
    var iccIds = ['12345', '22345'];
    var sandbox = sinon.sandbox.create();

    setup(function() {
      deviceInfoIccIds = document.getElementById('deviceInfo-iccids');
      MockNavigatorMozMobileConnections[0].iccId = iccIds[0];
    });

    teardown(function() {
      sandbox.restore();
    });

    suite('single sim', function() {
      test('the list item should be hidden when mozMobileConnections is ' +
        'unavailable', function() {
          navigator.mozMobileConnections = null;
          AboutMoreInfo.loadIccId();
          assert.isTrue(deviceInfoIccIds.parentNode.hidden);
          navigator.mozMobileConnections = MockNavigatorMozMobileConnections;
      });

      test('the list item should be hidden when mozTelephony is unavalilable',
        function() {
          navigator.mozTelephony = null;
          AboutMoreInfo.loadIccId();
          assert.isTrue(deviceInfoIccIds.parentNode.hidden);
          navigator.mozTelephony = MockNavigatorMozTelephony;
      });

      test('should show "Not available" when iccid is unavalilable',
        function() {
          MockNavigatorMozMobileConnections[0].iccId = null;
          sandbox.spy(MockL10n, 'localize');
          AboutMoreInfo.loadIccId();
          var span = deviceInfoIccIds.querySelector('span');
          sinon.assert.calledWith(MockL10n.localize, span, 'unavailable');
      });

      test('should show correct value when with iccid', function() {
        MockNavigatorMozMobileConnections[0].iccId = iccIds[0];
        AboutMoreInfo.loadIccId();
        var span = deviceInfoIccIds.querySelector('span');
        assert.equal(span.textContent, iccIds[0]);
      });
    });

    suite('multiple sim', function() {
      setup(function() {
        MockNavigatorMozMobileConnections.mAddMobileConnection();
        MockNavigatorMozMobileConnections[0].iccId = iccIds[0];
        MockNavigatorMozMobileConnections[1].iccId = iccIds[1];
      });

      test('should show correct sim indicator', function() {
        AboutMoreInfo.loadIccId();
        var spans = deviceInfoIccIds.querySelectorAll('span');
        assert.equal(spans[0].textContent, 'SIM 1: ' + iccIds[0]);
        assert.equal(spans[1].textContent, 'SIM 2: ' + iccIds[1]);
      });
    });
  });

  suite('loadImei >', function() {
    var deviceInfoImei;
    var sandbox = sinon.sandbox.create();

    setup(function() {
      deviceInfoImei = document.getElementById('deviceInfo-imei');
    });

    teardown(function() {
      sandbox.restore();
    });

    test('the list item should be hidden when mozMobileConnections is ' +
      'unavailable', function() {
        navigator.mozMobileConnections = null;
        AboutMoreInfo.loadImei();
        assert.isTrue(deviceInfoImei.parentNode.hidden);
        navigator.mozMobileConnections = MockNavigatorMozMobileConnections;
    });

    test('the list item should be hidden when mozTelephony is unavalilable',
      function() {
        navigator.mozTelephony = null;
        AboutMoreInfo.loadImei();
        assert.isTrue(deviceInfoImei.parentNode.hidden);
        navigator.mozTelephony = MockNavigatorMozTelephony;
    });

    test('should show correct value when with getting imei successfully',
      function() {
        var req = {
          result: {
            statusMessage: 'fakeImei'
          }
        };
        sandbox.stub(MockNavigatorMozMobileConnections[0], 'sendMMI',
          function() {
            return req;
        });
        AboutMoreInfo.loadImei();
        req.onsuccess();

        assert.equal(deviceInfoImei.textContent, 'fakeImei');
    });

    test('should show correct value when without correct result',
      function() {
        sandbox.spy(MockL10n, 'localize');
        var req = {};
        sandbox.stub(MockNavigatorMozMobileConnections[0], 'sendMMI',
          function() {
            return req;
        });
        AboutMoreInfo.loadImei();
        req.onsuccess();

        sinon.assert.calledWith(MockL10n.localize, deviceInfoImei,
          'unavailable');
    });

    test('should show correct value when with getting imei failed',
      function() {
        sandbox.spy(MockL10n, 'localize');
        var req = {};
        sandbox.stub(MockNavigatorMozMobileConnections[0], 'sendMMI',
          function() {
            return req;
        });
        AboutMoreInfo.loadImei();
        req.onerror();

        sinon.assert.calledWith(MockL10n.localize, deviceInfoImei,
          'unavailable');
    });
  });
});
