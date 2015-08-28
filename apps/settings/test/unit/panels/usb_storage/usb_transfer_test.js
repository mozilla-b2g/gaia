/* global MockAsyncStorage */
'use strict';

suite('start testing > ', function() {
  var realGetDeviceStorages;

  var MockSettingsListener;
  var MockDialogService;
  var usbTransfer;

  var MODE_UMS = 1;
  var MODE_UMS_UNPLUG = 2;
  var MODE_MTP = 3;
  var PROTOCOL_UMS = '0';
  var PROTOCOL_MTP = '1';

  var modules = [
    'panels/usb_storage/usb_transfer'
  ];
  var map = { //mock map
    '*': {
      'modules/settings_cache': 'unit/mock_settings_cache',
      'shared/settings_listener': 'MockSettingsListener',
      'modules/dialog_service': 'MockDialogService',
      'shared/async_storage': 'unit/mock_async_storage'
    }
  };
  var checkbox = document.createElement('input');
  var radio = document.createElement('input');

  setup(function(done) {
    var requireCtx = testRequire([], map, function() {});

    MockDialogService = {
      show: function() {},
      confirm: function() {}
    };
    define('MockDialogService', function() {
      return MockDialogService;
    });

    MockSettingsListener = {
      observe: function() {},
      getSettingsLock: function() {}
    };
    define('MockSettingsListener', function() {
      return MockSettingsListener;
    });

    requireCtx(modules, function(usb_transfer) {
      realGetDeviceStorages = window.navigator.getDeviceStorages;
      window.navigator.getDeviceStorages = sinon.stub().returns([{
        canBeShared: true
      }]);

      usbTransfer = usb_transfer();
      done();
    });
  });

  teardown(function() {
    window.navigator.getDeviceStorages = realGetDeviceStorages;
  });

  suite('initialization', function() {
    setup(function() {
      this.sinon.stub(usbTransfer, '_configProtocol');
      this.sinon.stub(MockSettingsListener, 'observe');
      usbTransfer.init({
        usbEnabledCheckBox: checkbox,
        protocols: [radio, radio]
      }, {
        usbHotProtocolSwitch: false
      });
    });

    test('init', function() {
      var keyUmsEnabled = 'ums.enabled';
      var keyTransferProtocol = 'usb.transfer';

      assert.isFalse(usbTransfer._usbHotProtocolSwitch);
      assert.ok(MockSettingsListener.observe.calledWith(keyTransferProtocol));
      assert.ok(MockSettingsListener.observe.calledWith(keyUmsEnabled));
    });
  });

  // mode 0 is disabled, should be filtered by _configProtocol
  suite('_changeMode', function() {
    setup(function() {
      this.sinon.stub(usbTransfer, '_setMode');
    });

    test('mode 1 + protocol ums', function() {
      usbTransfer._changeMode(MODE_UMS, PROTOCOL_UMS);
      assert.ok(!usbTransfer._setMode.called);
    });

    test('mode 2 + protocol ums', function() {
      usbTransfer._changeMode(MODE_UMS_UNPLUG, PROTOCOL_UMS);
      assert.ok(!usbTransfer._setMode.called);
    });

    test('mode 3 + protocol ums', function() {
      usbTransfer._changeMode(MODE_MTP, PROTOCOL_UMS);
      assert.ok(usbTransfer._setMode.calledWith(MODE_UMS));
    });

    test('mode 1 + protocol mtp', function() {
      usbTransfer._changeMode(MODE_UMS, PROTOCOL_MTP);
      assert.ok(usbTransfer._setMode.calledWith(MODE_MTP));
    });

    test('mode 2 + protocol mtp', function() {
      usbTransfer._changeMode(MODE_UMS_UNPLUG, PROTOCOL_MTP);
      assert.ok(usbTransfer._setMode.calledWith(MODE_MTP));
    });

    test('mode 3 + protocol mtp', function() {
      usbTransfer._changeMode(MODE_MTP, PROTOCOL_MTP);
      assert.ok(!usbTransfer._setMode.called);
    });

    suite('mode 3 + protocol ums + partial ums support', function() {
      var mockPromise;
      setup(function() {
        usbTransfer._partialUmsSupport = true;
      });

      test('should rollback to mtp when the user cancel it', function(done) {
        var mockLock = {
          set: sinon.stub()
        };
        this.sinon.stub(MockSettingsListener, 'getSettingsLock')
          .returns(mockLock);

        mockPromise = new Promise((resolve) => {
          resolve({ type: 'cancel'});
        });
        this.sinon.stub(MockDialogService, 'show').returns(mockPromise);
        usbTransfer._changeMode(MODE_MTP, PROTOCOL_UMS);
        assert.ok(MockDialogService.show.called);
        mockPromise.then(function() {
          assert.deepEqual(mockLock.set.args[0][0], {
            'usb.transfer': PROTOCOL_MTP
          });
        }).then(done, done);
      });

      test('should set to ums correctly when the user confirms',
        function(done) {
          mockPromise = new Promise((resolve) => {
            resolve({ type: 'submit'});
          });
          this.sinon.stub(MockDialogService, 'show').returns(mockPromise);
          usbTransfer._changeMode(MODE_MTP, PROTOCOL_UMS);
          assert.ok(MockDialogService.show.called);
          mockPromise.then(function() {
          assert.ok(usbTransfer._setMode.calledWith(MODE_UMS));
        }).then(done, done);
      });
    });

    suite('_umsCheckboxChange', function() {
      test('should show turn on warning dialog at first time', function() {
        MockAsyncStorage.setItem({'ums-turn-on-warning': true});
        this.sinon.spy(MockAsyncStorage, 'getItem');
        this.sinon.stub(MockDialogService, 'confirm').returns(Promise.resolve({
          type: 'submit'
        }));

        var checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = true;
        usbTransfer._umsCheckboxChange({
          target: checkbox
        });

        assert.ok(MockAsyncStorage.getItem.calledWith('ums-turn-on-warning'));
        assert.ok(MockDialogService.confirm.calledWith('ums-confirm'));
      });
    });

    suite('_umsEnabledHandler', function() {
      test('should disable protocol selections when ums enabled', function() {
        usbTransfer.init({
          usbEnabledCheckBox: checkbox,
          protocols: [radio, radio]
        }, {
          usbHotProtocolSwitch: false
        });
        usbTransfer._umsEnabledHandler(true);

        assert.ok(usbTransfer._elements.usbEnabledCheckBox.checked);
        assert.isTrue(usbTransfer._elements.protocols[0].disabled);
        assert.isTrue(usbTransfer._elements.protocols[1].disabled);
      });

      test('should enable protocol selections when ums disabled', function() {
        usbTransfer.init({
          usbEnabledCheckBox: checkbox,
          protocols: [radio, radio]
        }, {
          usbHotProtocolSwitch: false
        });
        usbTransfer._umsEnabledHandler(false);

        assert.isFalse(usbTransfer._elements.usbEnabledCheckBox.checked);
        assert.isFalse(usbTransfer._elements.protocols[0].disabled);
        assert.isFalse(usbTransfer._elements.protocols[1].disabled);
      });

      test('protocol selections should selectable when ' +
        'usbHotProtocolSwitch is true', function() {
        usbTransfer.init({
          usbEnabledCheckBox: checkbox,
          protocols: [radio, radio]
        }, {
          usbHotProtocolSwitch: true
        });
        usbTransfer._umsEnabledHandler(true);

        assert.ok(usbTransfer._elements.usbEnabledCheckBox.checked);
        assert.isFalse(usbTransfer._elements.protocols[0].disabled);
        assert.isFalse(usbTransfer._elements.protocols[1].disabled);
      });
    });
  });
});
