/* global MockNavigatorMozMobileConnections, MockNavigatorMozIccManager */

'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_icc_manager.js');
require('/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');

suite('about > hardware_info', function() {
  var hardwareInfo;
  var realL10n;
  var realNavigatorSettings;
  var realMobileConnections;
  var realIccManager;

  var modules = [
    'shared_mocks/mock_l10n',
    'shared_mocks/mock_navigator_moz_settings',
    'panels/about/hardware_info'
  ];
  var maps = {};

  var elements = {
    updateStatus: document.createElement('li'),
    deviceInfoPhoneNum: document.createElement('li'),
    deviceInfoMsisdns: document.createElement('li')
  };

  setup(function(done) {
    testRequire(modules, maps,
      function(MockL10n, MockNavigatorSettings, HardwareInfo) {
        realL10n = navigator.mozL10n;
        navigator.mozL10n = MockL10n;

        realIccManager = navigator.mozIccManager;
        navigator.mozIccManager = MockNavigatorMozIccManager;

        realMobileConnections = navigator.mozMobileConnections;
        navigator.mozMobileConnections = MockNavigatorMozMobileConnections;

        realNavigatorSettings = navigator.mozSettings;
        navigator.mozSettings = MockNavigatorSettings;

        hardwareInfo = HardwareInfo();
        hardwareInfo._elements = elements;
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
    var iccIds = ['12345', '22345'];

    setup(function() {
      MockNavigatorMozIccManager.addIcc(iccIds[0]);
      MockNavigatorMozMobileConnections[0].iccId = iccIds[0];
      this.sinon.spy(hardwareInfo, '_renderPhoneNumberElement');
    });

    suite('single sim', function() {
      test('the list item should be hidden when without iccinfo',
        function() {
          MockNavigatorMozIccManager.getIccById(iccIds[0]).iccInfo = null;
          hardwareInfo.init(elements);
          assert.isTrue(hardwareInfo._elements.deviceInfoPhoneNum.hidden);
      });

      test('should show unknown phone number when no msisdn and mdn',
        function() {
          MockNavigatorMozIccManager.getIccById(iccIds[0]).iccInfo = {};
          hardwareInfo._loadHardwareInfo();
          assert.ok(hardwareInfo._renderPhoneNumberElement.calledWith(
            {}, 0, false));
          assert.isFalse(hardwareInfo._elements.deviceInfoPhoneNum.hidden);
      });

      test('should show correct value when with mdn', function() {
        MockNavigatorMozIccManager.getIccById(iccIds[0]).iccInfo =
          { mdn: 'mdn' };
        hardwareInfo._loadHardwareInfo();
        assert.ok(hardwareInfo._renderPhoneNumberElement.calledWith(
          { mdn: 'mdn' }, 0, false));
        assert.isFalse(hardwareInfo._elements.deviceInfoPhoneNum.hidden);
      });

      test('should show correct value when with msisdn', function() {
        MockNavigatorMozIccManager.getIccById(iccIds[0]).iccInfo =
          { msisdn: 'msisdn' };
        hardwareInfo._loadHardwareInfo();
        assert.ok(hardwareInfo._renderPhoneNumberElement.calledWith(
          { msisdn: 'msisdn' }, 0, false));
        assert.isFalse(hardwareInfo._elements.deviceInfoPhoneNum.hidden);
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
          assert.isTrue(hardwareInfo._elements.deviceInfoPhoneNum.hidden);
      });

      test('should show the list item when there are iccinfos', function() {
        MockNavigatorMozIccManager.getIccById(iccIds[0]).iccInfo = null;
        MockNavigatorMozIccManager.getIccById(iccIds[1]).iccInfo = {};
        hardwareInfo._loadHardwareInfo();
        assert.isFalse(hardwareInfo._elements.deviceInfoPhoneNum.hidden);
      });

      test('should show unknown phone number when no msisdn and mdn',
        function() {
          MockNavigatorMozIccManager.getIccById(iccIds[0]).iccInfo = {};
          MockNavigatorMozIccManager.getIccById(iccIds[1]).iccInfo = {};
          hardwareInfo._loadHardwareInfo();
          assert.ok(hardwareInfo._renderPhoneNumberElement.calledWith(
            {}, 0, true));
          assert.ok(hardwareInfo._renderPhoneNumberElement.calledWith(
            {}, 1, true));
      });

      test('should show correct sim indicator', function() {
        hardwareInfo._loadHardwareInfo();
        assert.ok(hardwareInfo._renderPhoneNumberElement.calledWith(
          { mdn: 'mdn1' }, 0, true));
        assert.ok(hardwareInfo._renderPhoneNumberElement.calledWith(
          { mdn: 'mdn2' }, 1, true));
      });
    });
  });

  suite('_renderPhoneNumberElement >', function() {
    suite('single sim', function() {
      test('should show unknown phone number when no msisdn and mdn',
        function() {
          var span = hardwareInfo._renderPhoneNumberElement({}, 0, false);
          assert.ok(span.getAttribute('data-l10n-id', 'unknown-phoneNumber'));
      });

      test('should show correct value when with mdn', function() {
        var span = hardwareInfo._renderPhoneNumberElement(
          { mdn: 'mdn' }, 0, false);
        assert.equal(span.textContent, 'mdn');
      });

      test('should show correct value when with msisdn', function() {
        var span = hardwareInfo._renderPhoneNumberElement(
          { msisdn: 'msisdn' }, 0, false);
        assert.isFalse(hardwareInfo._elements.deviceInfoPhoneNum.hidden);
        assert.equal(span.textContent, 'msisdn');
      });
    });

    suite('multiple sim', function() {
      test('should show unknown phone number when no msisdn and mdn',
        function() {
          this.sinon.spy(navigator.mozL10n, 'setAttributes');
          var spans0 = hardwareInfo._renderPhoneNumberElement({}, 0, true);
          assert.equal(navigator.mozL10n.setAttributes.args[0][0], spans0);
          assert.equal(navigator.mozL10n.setAttributes.args[0][1],
            'unknown-phoneNumber-sim');
          assert.equal(navigator.mozL10n.setAttributes.args[0][2].index,
            1);
          var spans1 = hardwareInfo._renderPhoneNumberElement({}, 1, true);
          assert.equal(navigator.mozL10n.setAttributes.args[1][0], spans1);
          assert.equal(navigator.mozL10n.setAttributes.args[1][1],
            'unknown-phoneNumber-sim');
          assert.equal(navigator.mozL10n.setAttributes.args[1][2].index,
            2);
      });

      test('should show correct sim indicator', function() {
        hardwareInfo._loadHardwareInfo();
        var spans0 = hardwareInfo._renderPhoneNumberElement(
          { mdn: 'mdn1' }, 0, true);
        var spans1 = hardwareInfo._renderPhoneNumberElement(
          { mdn: 'mdn2' }, 1, true);

        var sim1Args = JSON.parse(spans0.getAttribute('data-l10n-args'));
        var sim2Args = JSON.parse(spans1.getAttribute('data-l10n-args'));
        assert.equal(spans0.getAttribute('data-l10n-id'),
          'deviceInfo-MSISDN-with-index');
        assert.equal(spans1.getAttribute('data-l10n-id'),
          'deviceInfo-MSISDN-with-index');
        assert.equal(sim1Args.index, 1);
        assert.equal(sim1Args.msisdn, 'mdn1');
        assert.equal(sim2Args.index, 2);
        assert.equal(sim2Args.msisdn, 'mdn2');
      });
    });
  });
});
