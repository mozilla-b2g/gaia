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
    var deviceInfoImeis;
    var sandbox = sinon.sandbox.create();

    setup(function() {
      deviceInfoImeis = document.getElementById('deviceInfo-imeis');
    });

    teardown(function() {
      sandbox.restore();
    });

    test('the list item should be hidden when mozMobileConnections is ' +
      'unavailable', function(done) {
        navigator.mozMobileConnections = null;
        AboutMoreInfo.loadImei().then(function() {
          assert.isTrue(deviceInfoImeis.parentNode.hidden);
          navigator.mozMobileConnections = MockNavigatorMozMobileConnections;
        }).then(done, done);
    });

    test('the list item should be hidden when mozTelephony is unavalilable',
      function(done) {
        navigator.mozTelephony = null;
        AboutMoreInfo.loadImei().then(function() {
          assert.isTrue(deviceInfoImeis.parentNode.hidden);
          navigator.mozTelephony = MockNavigatorMozTelephony;
        }).then(done, done);
    });

    test('should show correct value when getting an IMEI successfully',
      function(done) {
        var req = {
          result: {
            serviceCode: 'scImei',
            statusMessage: 'fakeImei'
          }
        };
        sandbox.stub(MockNavigatorMozMobileConnections[0], 'sendMMI',
          function() {
            return req;
        });
        var promise = AboutMoreInfo.loadImei();
        req.onsuccess();

        promise.then(function() {
          var span = deviceInfoImeis.querySelector('span');
          assert.equal(span.textContent, 'fakeImei');
          assert.equal(span.dataset.slot, 0);
        }).then(done, done);
    });

    test('should show correct value when without correct result',
      function(done) {
        sandbox.spy(MockL10n, 'localize');
        var req = {};
        sandbox.stub(MockNavigatorMozMobileConnections[0], 'sendMMI',
          function() {
            return req;
        });
        var promise = AboutMoreInfo.loadImei();
        req.onsuccess();

        promise.then(function() {
          var span = deviceInfoImeis.querySelector('span');
          sinon.assert.calledWith(MockL10n.localize, span, 'unavailable');
        }).then(done, done);
    });

    test('should show correct value when with getting imei failed',
      function(done) {
        sandbox.spy(MockL10n, 'localize');
        var req = {};
        sandbox.stub(MockNavigatorMozMobileConnections[0], 'sendMMI',
          function() {
            return req;
        });
        var promise = AboutMoreInfo.loadImei();
        req.onerror();

        promise.then(function() {
          var span = deviceInfoImeis.querySelector('span');
          sinon.assert.calledWith(MockL10n.localize, span, 'unavailable');
        }).then(done, done);
    });

    suite('multiple sim', function() {
      setup(function() {
        MockNavigatorMozMobileConnections.mAddMobileConnection();
      });

      test('should show multiple IMEI codes', function(done) {
        var reqs = [{
          result: {
            serviceCode: 'scImei',
            statusMessage: 'fakeImei1'
          }
        }, {
          result: {
            serviceCode: 'scImei',
            statusMessage: 'fakeImei2'
          }
        }];

        reqs.forEach(function(val, index) {
          sandbox.stub(MockNavigatorMozMobileConnections[index], 'sendMMI',
            function() { return val; });
        });

        var promise = AboutMoreInfo.loadImei();
        reqs.forEach(function(req) { req.onsuccess(); });

        promise.then(function() {
          var spans = deviceInfoImeis.querySelectorAll('span');
          reqs.forEach(function(reqs, index) {
            assert.equal(spans[index].textContent,
              'IMEI ' + (index + 1) + ': fakeImei' + (index + 1));
            assert.equal(spans[index].dataset.slot, index);
          });
        }).then(done, done);
      });
    });
  });
});
