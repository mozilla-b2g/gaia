/* global MockNavigatorMozMobileConnections, MockNavigatorMozTelephony */
'use strict';

require('/shared/test/unit/load_body_html_helper.js');
require('/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
require('/shared/test/unit/mocks/mock_navigator_moz_telephony.js');

suite('about more info >', function() {
  var moreInfo;
  var realL10n, realMobileConnections, realTelephony;
  var elements = {};

  var modules = [
    'shared_mocks/mock_l10n',
    'panels/about_more_info/more_info'
  ];
  var maps = {
    '*': {
      'modules/bluetooth': 'MockBluetooth'
    }
  };

  suiteSetup(function(done) {
    this.MockBluetooth = {
      enabled: false,
      numberOfPairedDevices: 0,
      observe: function() {},
      unobserve: function() {}
    };

    var requireCtx = testRequire([], maps, function() {});
    define('MockBluetooth', function() {
      return this.MockBluetooth;
    }.bind(this));

    requireCtx(modules, function(MockL10n, module) {
      realL10n = navigator.mozL10n;
      navigator.mozL10n = MockL10n;

      realMobileConnections = navigator.mozMobileConnections;
      navigator.mozMobileConnections = MockNavigatorMozMobileConnections;

      realTelephony = navigator.mozTelephony;
      navigator.mozTelephony = MockNavigatorMozTelephony;

      moreInfo = module();
      done();
    });
  });

  suiteTeardown(function() {
    navigator.mozTelephony.mTeardown();
    navigator.mozMobileConnections.mTeardown();

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

    elements.deviceInfoImeis = document.querySelector('.deviceInfo-imeis');
    elements.deviceInfoIccIds = document.querySelector('.deviceInfo-iccids');
  });

  teardown(function() {
    document.body.innerHTML = '';
  });

  suite('Initialization >', function() {
    setup(function() {
      this.sinon.stub(moreInfo, '_loadImei');
      this.sinon.stub(moreInfo, '_loadIccId');
      this.sinon.stub(moreInfo, '_loadGaiaCommit');
      this.sinon.stub(moreInfo, '_loadMacAddress');
      this.sinon.spy(this.MockBluetooth, 'observe');
      moreInfo.init(elements);
    });

    test('function called', function() {
      assert.ok(moreInfo._loadImei.called);
      assert.ok(moreInfo._loadIccId.called);
      assert.ok(moreInfo._loadGaiaCommit.called);
      assert.ok(moreInfo._loadMacAddress.called);
      assert.ok(this.MockBluetooth.observe.calledWith('address'));
    });
  });

  suite('loadIccId >', function() {
    var iccIds = ['12345', '22345'];

    setup(function() {
      navigator.mozMobileConnections[0].iccId = iccIds[0];
    });

    suite('single sim', function() {
      test('the list item should be hidden when mozMobileConnections is ' +
        'unavailable', function() {
          navigator.mozMobileConnections = null;
          // moreInfo._elements.deviceInfoIccIds = elements.deviceInfoIccIds;
          moreInfo._loadIccId();
          assert.isTrue(moreInfo._elements.deviceInfoIccIds.parentNode.hidden);
          navigator.mozMobileConnections = MockNavigatorMozMobileConnections;
      });

      test('the list item should be hidden when mozTelephony is unavalilable',
        function() {
          navigator.mozTelephony = null;
          moreInfo._loadIccId();
          assert.isTrue(moreInfo._elements.deviceInfoIccIds.parentNode.hidden);
          navigator.mozTelephony = MockNavigatorMozTelephony;
      });

      test('should show "Not available" when iccid is unavalilable',
        function() {
          MockNavigatorMozMobileConnections[0].iccId = null;
          this.sinon.spy(navigator.mozL10n, 'setAttributes');
          moreInfo._loadIccId();
          var span = moreInfo._elements.deviceInfoIccIds.querySelector('span');
          assert.ok(navigator.mozL10n.setAttributes.calledWith(span,
            'unavailable'));
      });

      test('should show correct value when with iccid', function() {
        MockNavigatorMozMobileConnections[0].iccId = iccIds[0];
        moreInfo._loadIccId();
        var span = moreInfo._elements.deviceInfoIccIds.querySelector('span');
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
        moreInfo._loadIccId();
        var spans = moreInfo._elements.deviceInfoIccIds
          .querySelectorAll('span');
        assert.equal(spans[0].textContent, 'SIM 1: ' + iccIds[0]);
        assert.equal(spans[1].textContent, 'SIM 2: ' + iccIds[1]);
      });
    });
  });

  suite('loadImei >', function() {
    teardown(function() {
      navigator.mozMobileConnections.mTeardown();
    });

    test('the list item should be hidden when mozMobileConnections is ' +
      'unavailable', function(done) {
        navigator.mozMobileConnections = null;
        moreInfo._loadImei().then(function() {
          assert.isTrue(moreInfo._elements.deviceInfoImeis.parentNode.hidden);
          navigator.mozMobileConnections = MockNavigatorMozMobileConnections;
        }).then(done, done);
    });

    test('the list item should be hidden when mozTelephony is unavalilable',
      function(done) {
        navigator.mozTelephony = null;
        moreInfo._loadImei().then(function() {
          assert.isTrue(moreInfo._elements.deviceInfoImeis.parentNode.hidden);
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
        this.sinon.stub(MockNavigatorMozMobileConnections[0], 'sendMMI',
          function() {
            return req;
        });
        var promise = moreInfo._loadImei();
        req.onsuccess();

        promise.then(function() {
          var span = moreInfo._elements.deviceInfoImeis.querySelector('span');
          assert.equal(span.textContent, 'fakeImei');
          assert.equal(span.dataset.slot, 0);
        }).then(done, done);
    });

    test('should show correct value when without correct result',
      function(done) {
        var req = {};
        this.sinon.stub(MockNavigatorMozMobileConnections[0], 'sendMMI',
          function() {
            return req;
        });
        var promise = moreInfo._loadImei();
        req.onsuccess();

        promise.then(function() {
          var span = moreInfo._elements.deviceInfoImeis.querySelector('span');
          assert.equal(span.getAttribute('data-l10n-id'), 'unavailable');
        }).then(done, done);
    });

    test('should show correct value when with getting imei failed',
      function(done) {
        var req = {};
        this.sinon.stub(MockNavigatorMozMobileConnections[0], 'sendMMI',
          function() {
            return req;
        });
        var promise = moreInfo._loadImei();
        req.onerror();

        promise.then(function() {
          var span = moreInfo._elements.deviceInfoImeis.querySelector('span');
          assert.equal(span.getAttribute('data-l10n-id'), 'unavailable');
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
          this.sinon.stub(MockNavigatorMozMobileConnections[index], 'sendMMI',
            function() { return val; });
        }.bind(this));

        var promise = moreInfo._loadImei();
        reqs.forEach(function(req) { req.onsuccess(); });

        promise.then(function() {
          var spans = moreInfo._elements.deviceInfoImeis
            .querySelectorAll('span');
          reqs.forEach(function(reqs, index) {
            assert.equal(spans[index].textContent,
              'IMEI ' + (index + 1) + ': fakeImei' + (index + 1));
            assert.equal(spans[index].dataset.slot, index);
          });
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
