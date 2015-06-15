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
      'modules/dialog_service': 'MockDialogService'
    }
  };

  setup(function(done) {
    var requireCtx = testRequire([], map, function() {});

    MockDialogService = {
      show: function() {}
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
      usbTransfer.init();
    });

    test('init', function() {
      MockSettingsListener.observe.args[0][2].call(usbTransfer, 'fakeProtocol');
      assert.ok(usbTransfer._configProtocol.calledWith('fakeProtocol'));
    });
  });

  // mode 0 is disabled, should be filtered by _configProtocol
  suite('_changeMode', function() {
    setup(function() {
      this.sinon.stub(usbTransfer, '_setMode');
    });

    test('mode 1 + protocol ums', function(done) {
      usbTransfer._changeMode(MODE_UMS, PROTOCOL_UMS).then(() => {
        assert.ok(!usbTransfer._setMode.called);
      }).then(done, done);
    });

    test('mode 2 + protocol ums', function(done) {
      usbTransfer._changeMode(MODE_UMS_UNPLUG, PROTOCOL_UMS).then(() => {
        assert.ok(!usbTransfer._setMode.called);
      }).then(done, done);
    });

    test('mode 3 + protocol ums', function(done) {
      usbTransfer._changeMode(MODE_MTP, PROTOCOL_UMS).then(() => {
        assert.ok(usbTransfer._setMode.calledWith(MODE_UMS));
      }).then(done, done);
    });

    test('mode 1 + protocol mtp', function(done) {
      usbTransfer._changeMode(MODE_UMS, PROTOCOL_MTP).then(() => {
        assert.ok(usbTransfer._setMode.calledWith(MODE_MTP));
      }).then(done, done);
    });

    test('mode 2 + protocol mtp', function(done) {
      usbTransfer._changeMode(MODE_UMS_UNPLUG, PROTOCOL_MTP).then(() => {
        assert.ok(usbTransfer._setMode.calledWith(MODE_MTP));
      }).then(done, done);
    });

    test('mode 3 + protocol mtp', function(done) {
      usbTransfer._changeMode(MODE_MTP, PROTOCOL_MTP).then(() => {
        assert.ok(!usbTransfer._setMode.called);
      }).then(done, done);
    });

    suite('mode 3 + protocol ums + partial ums support', function() {
      setup(function() {
        usbTransfer._partialUmsSupport = true;
      });

      test('should rollback to mtp when the user cancel it', function(done) {
        var mockLock = {
          set: sinon.stub()
        };
        this.sinon.stub(MockSettingsListener,
          'getSettingsLock').returns(mockLock);

        this.sinon.stub(MockDialogService, 'show').returns(Promise.resolve({
          type: 'cancel'
        }));
        usbTransfer._changeMode(MODE_MTP, PROTOCOL_UMS).then(() => {
          assert.ok(MockDialogService.show.called);
          assert.deepEqual(mockLock.set.args[0][0], {
            'usb.transfer': PROTOCOL_MTP
          });
        }).then(done, done);
      });

      test('should set to ums correctly when the user confirms',
        function(done) {
          this.sinon.stub(MockDialogService, 'show').returns(Promise.resolve({
            type: 'submit'
          }));
          usbTransfer._changeMode(MODE_MTP, PROTOCOL_UMS).then(() => {
            assert.ok(usbTransfer._setMode.calledWith(MODE_UMS));
          }).then(done, done);
      });
    });
  });
});
