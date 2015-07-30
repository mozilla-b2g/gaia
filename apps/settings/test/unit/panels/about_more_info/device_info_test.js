/* global MockNavigatorMozMobileConnections, MockNavigatorMozTelephony */
'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
require('/shared/test/unit/mocks/mock_navigator_moz_telephony.js');

suite('about device info >', function() {
  var deviceInfo;
  var realL10n;
  var realMobileConnections;
  var realTelephony;

  var modules = [
    'shared_mocks/mock_l10n',
    'panels/about_more_info/device_info'
  ];

  var maps = {};

  var elements = {
    listImeis: document.createElement('li'),
    listIccIds: document.createElement('li'),
    deviceInfoImeis: document.createElement('small'),
    deviceInfoIccIds: document.createElement('small')
  };

  setup(function(done) {
    testRequire(modules, maps, function(MockL10n, DeviceInfo) {
      realL10n = navigator.mozL10n;
      navigator.mozL10n = MockL10n;

      realMobileConnections = navigator.mozMobileConnections;
      navigator.mozMobileConnections = MockNavigatorMozMobileConnections;

      realTelephony = navigator.mozTelephony;
      navigator.mozTelephony = MockNavigatorMozTelephony;

      deviceInfo = DeviceInfo();
      deviceInfo._elements = elements;
      done();
    });
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    realL10n = null;

    navigator.mozMobileConnections = realMobileConnections;
    realMobileConnections = null;

    navigator.mozTelephony = realTelephony;
    realTelephony = null;
  });

  suite('Initialization >', function() {
    setup(function() {
      this.sinon.stub(deviceInfo, '_loadImei');
      this.sinon.stub(deviceInfo, '_loadIccId');
      deviceInfo.init(elements);
    });

    test('function called', function() {
      assert.ok(deviceInfo._loadImei.called);
      assert.ok(deviceInfo._loadIccId.called);
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
          deviceInfo._loadIccId();
          assert.isTrue(deviceInfo._elements.listIccIds.hidden);
      });

      test('the list item should be hidden when mozTelephony is unavalilable',
        function() {
          navigator.mozTelephony = null;
          deviceInfo._loadIccId();
          assert.isTrue(deviceInfo._elements.listIccIds.hidden);
      });

      test('should show "Not available" when iccid is unavalilable',
        function() {
          navigator.mozMobileConnections[0].iccId = null;
          deviceInfo._loadIccId();
          var span = deviceInfo._elements.deviceInfoIccIds
            .querySelector('span');
          this.sinon.spy(span, 'setAttribute');
          assert.equal(span.getAttribute('data-l10n-id'), 'unavailable');
      });

      test('should show correct value when with iccid', function() {
        deviceInfo._loadIccId();
        var span = deviceInfo._elements.deviceInfoIccIds.querySelector('span');
        assert.equal(span.textContent, iccIds[0]);
      });
    });

    suite('multiple sim', function() {
      setup(function() {
        navigator.mozMobileConnections.mAddMobileConnection();
      });

      test('should show correct sim indicator', function() {
        iccIds = ['12345', '22345'];
        navigator.mozMobileConnections[0].iccId = iccIds[0];
        navigator.mozMobileConnections[1].iccId = iccIds[1];
        this.sinon.stub(navigator.mozL10n, 'setAttributes');
        deviceInfo._loadIccId();
        var spans = deviceInfo._elements.deviceInfoIccIds
          .querySelectorAll('span');
        iccIds.forEach(function(iccId, index) {
          assert.ok(navigator.mozL10n.setAttributes.calledWith(
            spans[index], 'deviceInfo-ICCID-with-index', {
              index: index + 1,
              iccid: iccId
            }
          ));
        });
      });

      test('should show unavailable sim indicator', function() {
        navigator.mozMobileConnections[0].iccId = null;
        navigator.mozMobileConnections[1].iccId = null;
        this.sinon.stub(navigator.mozL10n, 'setAttributes');
        deviceInfo._loadIccId();
        var spans = deviceInfo._elements.deviceInfoIccIds
          .querySelectorAll('span');
        assert.ok(navigator.mozL10n.setAttributes.calledWith(
          spans[0], 'deviceInfo-ICCID-unavailable-sim', {index:1}));
        assert.ok(navigator.mozL10n.setAttributes.calledWith(
          spans[1], 'deviceInfo-ICCID-unavailable-sim', {index:2}));
      });
    });
  });

  suite('loadImei >', function() {
    test('the list item should be hidden when mozMobileConnections is ' +
      'unavailable', function(done) {
      navigator.mozMobileConnections = null;
      deviceInfo._loadImei().then(function() {
        assert.isTrue(deviceInfo._elements.listImeis.hidden);
      }).then(done, done);
    });

    test('the list item should be hidden when mozTelephony is unavalilable',
      function(done) {
        navigator.mozTelephony = null;
        deviceInfo._loadImei().then(function() {
          assert.isTrue(deviceInfo._elements.listImeis.hidden);
        }).then(done, done);
    });

    test('should show correct value when getting an IMEI successfully',
      function(done) {
        this.sinon.stub(navigator.mozL10n, 'setAttributes');
        this.sinon.stub(deviceInfo, '_getImeiCode', function() {
          return Promise.resolve('fakeImei');
        });
        var promise = deviceInfo._loadImei();
        assert.ok(deviceInfo._getImeiCode.called);

        promise.then(function() {
          var span = deviceInfo._elements.deviceInfoImeis.querySelector('span');
          assert.equal(span.dataset.slot, 0);
          assert.ok(navigator.mozL10n.setAttributes.calledWith(
            span, 'deviceInfo-IMEI-with-index', {
              index: 1,
              imei: 'fakeImei'
            }
          ));
        }).then(done, done);
    });

    test('should show correct value when with getting imei failed',
      function(done) {
        this.sinon.stub(deviceInfo, '_getImeiCode', function() {
          return Promise.reject();
        });
        var promise = deviceInfo._loadImei();

        promise.then(function() {
          var span = deviceInfo._elements.deviceInfoImeis.querySelector('span');
          assert.equal(span.getAttribute('data-l10n-id'), 'unavailable');
        }).then(done, done);
    });

    suite('multiple sim', function() {
      setup(function() {
        navigator.mozMobileConnections.mAddMobileConnection();
      });

      test('should show multiple IMEI codes', function(done) {
        var count = 0;
        this.sinon.stub(navigator.mozL10n, 'setAttributes');
        this.sinon.stub(deviceInfo, '_getImeiCode', function() {
          count += 1;
          return Promise.resolve('fakeImei' + count);
        });
        var promise = deviceInfo._loadImei();

        promise.then(function() {
          var spans = deviceInfo._elements.deviceInfoImeis
            .querySelectorAll('span');
          for (var index = 0; index < 2; index++) {
            assert.equal(spans[index].dataset.slot, index);
            assert.ok(navigator.mozL10n.setAttributes.calledWith(
              spans[index], 'deviceInfo-IMEI-with-index', {
                index: index + 1,
                imei: 'fakeImei' + (index + 1)
              }
            ));
          }
        }).then(done, done);
      });
    });
  });

  suite('getImeiCode >', function() {
    test('when dial data is resolved', function(done) {
      this.sinon.stub(navigator.mozTelephony, 'dial', function() {
        return Promise.resolve({
          result: Promise.resolve({
            success: true,
            serviceCode: 'scImei',
            statusMessage: 'fakeImei'
          })
        });
      });

      var promise = deviceInfo._getImeiCode(0);
      assert.ok(navigator.mozTelephony.dial.called);
      promise.then(function(data) {
        assert.equal(data, 'fakeImei');
      }).then(done, done);
    });

    test('when dial data is invalid', function(done) {
      this.sinon.stub(navigator.mozTelephony, 'dial', function() {
        return Promise.resolve({
          result: Promise.resolve({})
        });
      });

      var promise = deviceInfo._getImeiCode(0);
      promise.catch(function(result) {
        assert.deepEqual(result,
          new Error('Could not retrieve the IMEI code for SIM 0'));
      }).then(done, done);
    });
    
    test('when dial data is rejected', function(done) {
      this.sinon.stub(navigator.mozTelephony, 'dial', function() {
        return Promise.resolve({
          result: Promise.reject({
            success: false,
            statusMessage: 'error'
          })
        });
      });

      var promise = deviceInfo._getImeiCode(0);
      assert.ok(navigator.mozTelephony.dial.called);
      promise.catch(function(result) {
        assert.equal(result.statusMessage, 'error');
      }).then(done, done);
    });
  });
});
