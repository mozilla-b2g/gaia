/* global MockL10n, MockNavigatorMozMobileConnections,
          MockNavigatorMozTelephony */
'use strict';

requireApp('settings/test/unit/mocks_helper.js');
require('/shared/test/unit/load_body_html_helper.js');
require('/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
require('/shared/test/unit/mocks/mock_navigator_moz_telephony.js');
require('/shared/test/unit/mocks/mock_l10n.js');

suite('about >', function() {
  var realL10n, realMobileConnections, realTelephony;
  var AboutMoreInfo;
  var MockVersionDetector;
  var MockBluetooth1, MockBluetooth2;

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

  setup(function(done) {
    loadBodyHTML('./_about_more_info.html');

    var map = {
      '*': {
        'modules/bluetooth/version_detector': 'MockVersionDetector',
        'modules/bluetooth/bluetooth_v1': 'MockBluetooth1',
        'modules/bluetooth/bluetooth': 'MockBluetooth2'
      }
    };

    var requireCtx = testRequire([], map, function() {});

    MockVersionDetector = {
      getVersion: function() {}
    };
    define('MockVersionDetector', function() {
      return MockVersionDetector;
    });

    MockBluetooth1 = {
      observe: function() {},
      address: ''
    };
    define('MockBluetooth1', function() {
      return MockBluetooth1;
    });

    MockBluetooth2 = {
      observe: function() {},
      address: ''
    };
    define('MockBluetooth2', function() {
      return MockBluetooth2;
    });

    requireCtx(['about_more_info'], function(AboutMoreInfoModule) {
      AboutMoreInfo = AboutMoreInfoModule;
      done();
    });
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
          sandbox.spy(MockL10n, 'setAttributes');
          AboutMoreInfo.loadIccId();
          var span = deviceInfoIccIds.querySelector('span');
          sinon.assert.calledWith(MockL10n.setAttributes, span, 'unavailable');
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
        sandbox.stub(MockNavigatorMozTelephony, 'dial');
        MockNavigatorMozTelephony.dial.returns(
          Promise.resolve({
            result: Promise.resolve({
              success: true,
              serviceCode: 'scImei',
              statusMessage: 'fakeImei'
            })
          })
        );
        var promise = AboutMoreInfo.loadImei();

        promise.then(function() {
          var span = deviceInfoImeis.querySelector('span');
          assert.equal(span.textContent, 'fakeImei');
          assert.equal(span.dataset.slot, 0);
        }).then(done, done);
    });

    test('should show correct value when without correct result',
      function(done) {
        sandbox.stub(MockNavigatorMozTelephony, 'dial');
        MockNavigatorMozTelephony.dial.returns(
          Promise.resolve({
            result: Promise.resolve({})
          })
        );
        var promise = AboutMoreInfo.loadImei();

        promise.then(function() {
          var span = deviceInfoImeis.querySelector('span');
          assert.equal(span.getAttribute('data-l10n-id'), 'unavailable');
        }).then(done, done);
    });

    test('should show correct value when with getting imei failed',
      function(done) {
        sandbox.stub(MockNavigatorMozTelephony, 'dial');
        MockNavigatorMozTelephony.dial.returns(
          Promise.resolve({
            result: Promise.reject({
              success: false,
              statusMessage: 'error'
            })
          })
        );
        var promise = AboutMoreInfo.loadImei();

        promise.then(function() {
          var span = deviceInfoImeis.querySelector('span');
          assert.equal(span.getAttribute('data-l10n-id'), 'unavailable');
        }).then(done, done);
    });

    suite('multiple sim', function() {
      var imeisNum = 2;

      setup(function() {
        MockNavigatorMozMobileConnections.mAddMobileConnection();
      });

      test('should show multiple IMEI codes', function(done) {
        sandbox.stub(MockNavigatorMozTelephony, 'dial');

        for (var index = 0; index < imeisNum; index++) {
          MockNavigatorMozTelephony.dial.onCall(index).returns(
            Promise.resolve({
              result: Promise.resolve({
                success: true,
                serviceCode: 'scImei',
                statusMessage: 'fakeImei' + (index + 1)
              })
            })
          );
        }

        var promise = AboutMoreInfo.loadImei();

        promise.then(function() {
          var spans = deviceInfoImeis.querySelectorAll('span');

          for (var index = 0; index < imeisNum; index++) {
            assert.equal(spans[index].textContent,
              'IMEI ' + (index + 1) + ': fakeImei' + (index + 1));
            assert.equal(spans[index].dataset.slot, index);
          }
        }).then(done, done);
      });
    });
  });

  suite('loadBluetoothAddress >', function() {
    test('should show bluetooth address', function(done) {
      var fakeAddress = 'fakeAddress';
      MockBluetooth1.address = fakeAddress;
      this.sinon.stub(MockBluetooth1, 'observe');
      this.sinon.stub(MockVersionDetector, 'getVersion').returns(1);
      this.sinon.spy(AboutMoreInfo, '_refreshBluetoothAddress');

      AboutMoreInfo.loadBluetoothAddress().then(function() {
        sinon.assert.calledWith(MockBluetooth1.observe, 'address');
        assert.equal(AboutMoreInfo._refreshBluetoothAddress.args[0][0],
          fakeAddress);

        // Ensure the observer works
        var fakeAddress2 = 'fakeAddress2';
        MockBluetooth1.observe.args[0][1](fakeAddress2);
        assert.equal(AboutMoreInfo._refreshBluetoothAddress.args[1][0],
          fakeAddress2);
      }, function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });

    suite('should use correct bluetooth module', function() {
      setup(function() {
        this.sinon.stub(MockBluetooth1, 'observe');
        this.sinon.stub(MockBluetooth2, 'observe');
      });

      test('bluetooth version 1', function(done) {
        this.sinon.stub(MockVersionDetector, 'getVersion').returns(1);
        AboutMoreInfo.loadBluetoothAddress().then(function() {
          assert.isTrue(MockBluetooth1.observe.called);
          assert.isTrue(MockBluetooth2.observe.notCalled);
        }, function() {
          // This function does not reject.
          assert.isTrue(false);
        }).then(done, done);
      });

      test('bluetooth version 2', function(done) {
        this.sinon.stub(MockVersionDetector, 'getVersion').returns(2);
        AboutMoreInfo.loadBluetoothAddress().then(function() {
          assert.isTrue(MockBluetooth1.observe.notCalled);
          assert.isTrue(MockBluetooth2.observe.called);
        }, function() {
          // This function does not reject.
          assert.isTrue(false);
        }).then(done, done);
      });
    });
  });
});
