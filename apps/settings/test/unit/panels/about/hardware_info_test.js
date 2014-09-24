/* global MockNavigatorMozMobileConnections, MockNavigatorMozIccManager */

'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_icc_manager.js');
require('/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');

suite('about > hardware_info', function() {
  var hardwareInfo;
  var realL10n, realNavigatorSettings, realMobileConnections, realIccManager;
  var elements = {};

  var modules = [
    'shared_mocks/mock_l10n',
    'shared_mocks/mock_navigator_moz_settings',
    'panels/about/hardware_info'
  ];
  var maps = {
    '*': {}
  };

  suiteSetup(function(done) {
    testRequire(modules, maps,
      function(MockL10n, MockNavigatorSettings, module) {
        realL10n = navigator.mozL10n;
        navigator.mozL10n = MockL10n;

        realIccManager = navigator.mozIccManager;
        navigator.mozIccManager = MockNavigatorMozIccManager;

        realMobileConnections = navigator.mozMobileConnections;
        navigator.mozMobileConnections = MockNavigatorMozMobileConnections;

        realNavigatorSettings = navigator.mozSettings;
        navigator.mozSettings = MockNavigatorSettings;

        hardwareInfo = module();

        var updateNodes =
        '<section id="root" role="region"></section>' +
        '<ul>' +
          '<li class="deviceinfo-phone-num">' +
            '<small class="deviceInfo-msisdns"></small>' +
          '</li>' +
          '<li>' +
            '<small class="last-update-date"></small>' +
          '</li>' +
          '<li>' +
            '<button class="check-update-now">Check Now</button>' +
          '</li>' +
          '<li class="update-status description">' +
            '<p class="general-information description">' +
              'Checking for update...</p>' +
            '<p class="system-update-status description"></p>' +
          '</li>' +
        '</ul>';

        document.body.insertAdjacentHTML('beforeend', updateNodes);

        elements.updateStatus = document.querySelector('.update-status');
        elements.deviceInfoPhoneNum =
          document.querySelector('.deviceinfo-phone-num');
        elements.deviceInfoMsisdns =
          document.querySelector('.deviceInfo-msisdns');

        done();
    });
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    realL10n = null;

    navigator.mozSettings = realNavigatorSettings;
    realNavigatorSettings = null;

    navigator.mozMobileConnections = realMobileConnections;
    realMobileConnections = null;

    navigator.mozIccManager = realIccManager;
    realIccManager = null;
  });

  suite('initiation', function() {
    setup(function() {
      this.sinon.stub(hardwareInfo, '_loadHardwareInfo');
      hardwareInfo.init(elements);
    });

    test('_loadHardwareInfo and _loadLastUpdated are called while initiate',
      function() {
        assert.ok(hardwareInfo._loadHardwareInfo.called);
    });
  });

  suite('loadHardwareInfo >', function() {
    var deviceInfoPhoneNum;
    var iccIds = ['12345', '22345'];

    setup(function() {
      deviceInfoPhoneNum = document.querySelector('.deviceinfo-phone-num');
      MockNavigatorMozIccManager.addIcc(iccIds[0]);
      MockNavigatorMozMobileConnections[0].iccId = iccIds[0];
    });

    suite('single sim', function() {
      test('the list item should be hidden when without iccinfo',
        function() {
          MockNavigatorMozIccManager.getIccById(iccIds[0]).iccInfo = null;
          hardwareInfo._loadHardwareInfo();
          assert.isTrue(deviceInfoPhoneNum.hidden);
      });

      test('should show unknown phone number when no msisdn and mdn',
        function() {
          MockNavigatorMozIccManager.getIccById(iccIds[0]).iccInfo = {};
          this.sinon.spy(navigator.mozL10n, 'setAttributes');
          hardwareInfo._loadHardwareInfo();
          var span =
            deviceInfoPhoneNum.querySelector('.deviceInfo-msisdns span');
          assert.ok(navigator.mozL10n.setAttributes.calledWith(span,
            'unknown-phoneNumber'));
      });

      test('should show correct value when with mdn', function() {
        MockNavigatorMozIccManager.getIccById(iccIds[0]).iccInfo =
          { mdn: 'mdn' };
        hardwareInfo._loadHardwareInfo();
        var span = deviceInfoPhoneNum.querySelector('.deviceInfo-msisdns span');
        assert.equal(span.textContent, 'mdn');
      });

      test('should show correct value when with msisdn', function() {
        MockNavigatorMozIccManager.getIccById(iccIds[0]).iccInfo =
          { msisdn: 'msisdn' };
        hardwareInfo._loadHardwareInfo();
        var span = deviceInfoPhoneNum.querySelector('.deviceInfo-msisdns span');
        assert.equal(span.textContent, 'msisdn');
      });
    });

    suite('multiple sim', function() {
      setup(function() {
        MockNavigatorMozIccManager.addIcc(iccIds[1]);
        MockNavigatorMozMobileConnections.mAddMobileConnection();
        MockNavigatorMozMobileConnections[1].iccId = iccIds[1];
        MockNavigatorMozIccManager.getIccById(iccIds[0]).iccInfo =
          { mdn: 'mdn1' };
        MockNavigatorMozIccManager.getIccById(iccIds[1]).iccInfo =
          { mdn: 'mdn2' };
      });

      test('the list item should be hidden when without iccinfo',
        function() {
          MockNavigatorMozIccManager.getIccById(iccIds[0]).iccInfo = null;
          MockNavigatorMozIccManager.getIccById(iccIds[1]).iccInfo = null;
          hardwareInfo._loadHardwareInfo();
          assert.isTrue(deviceInfoPhoneNum.hidden);
      });

      test('should show the list item when there are iccinfos', function() {
        MockNavigatorMozIccManager.getIccById(iccIds[0]).iccInfo = null;
        MockNavigatorMozIccManager.getIccById(iccIds[1]).iccInfo = {};
        hardwareInfo._loadHardwareInfo();
        assert.isFalse(deviceInfoPhoneNum.hidden);
      });

      test('should show unknown phone number when no msisdn and mdn',
        function() {
          MockNavigatorMozIccManager.getIccById(iccIds[0]).iccInfo = {};
          MockNavigatorMozIccManager.getIccById(iccIds[1]).iccInfo = {};
          this.sinon.spy(navigator.mozL10n, 'setAttributes');
          hardwareInfo._loadHardwareInfo();
          var spans =
            deviceInfoPhoneNum.querySelectorAll('.deviceInfo-msisdns span');

          assert.deepEqual(navigator.mozL10n.setAttributes.args[0], [
            spans[0], 'unknown-phoneNumber-sim', { index: 1 }
          ]);
          assert.deepEqual(navigator.mozL10n.setAttributes.args[1], [
            spans[1], 'unknown-phoneNumber-sim', { index: 2 }
          ]);
      });

      test('should show correct sim indicator', function() {
        hardwareInfo._loadHardwareInfo();
        var spans =
          deviceInfoPhoneNum.querySelectorAll('.deviceInfo-msisdns span');
        assert.equal(spans[0].textContent, 'SIM 1: mdn1');
        assert.equal(spans[1].textContent, 'SIM 2: mdn2');
      });
    });
  });
});
