'use strict';

suite('BluetoothAdapterManager', function() {
  var adapterManager;

  setup(function(done) {
    var modules = [
      'modules/bluetooth/bluetooth_adapter_manager'
    ];

    var map = {
      'modules/bluetooth': {
        'modules/navigator/mozBluetooth': 'MockNavigatorBluetooth'
      }
    };

    this.MockNavigatorBluetooth = {
      defaultAdapter: {},
      callbacks: {
        'onattributechanged': []
      },
      addEventListener: function(eventName, callback) {
        this.callbacks[eventName].push(callback);
      }
    };

    define('MockNavigatorBluetooth', function() {
      return this.MockNavigatorBluetooth;
    }.bind(this));

    testRequire(modules, map, function(AdapterManager) {
      adapterManager = AdapterManager;
      done();
    });
  });

  suite('_init > ', function() {
    setup(function() {
      this.sinon.stub(adapterManager, '_watchMozBluetoothOnattributechanged');
      this.sinon.stub(adapterManager, '_initDefaultAdapter');
    });

    test('mozBluetooth onattributechanged should be watched, ' +
         'defaultAdapter should be inited ', function() {
      adapterManager._init();
      assert.isTrue(adapterManager._watchMozBluetoothOnattributechanged.called);
      assert.isTrue(adapterManager._initDefaultAdapter.called);
    });
  });

  suite('_watchMozBluetoothOnattributechanged > ', function() {
    var eventName, mockEvent;
    setup(function() {
      this.sinon.spy(this.MockNavigatorBluetooth, 'addEventListener');
      eventName = 'onattributechanged';
      mockEvent = {
        attrs: ['defaultAdapter']
      };
    });

    test('"onattributechanged" event should be watched ' +
         'defaultAdapter should be inited while event is coming ', function() {
      adapterManager._watchMozBluetoothOnattributechanged();
      assert.isTrue(
        this.MockNavigatorBluetooth.addEventListener.calledWith(eventName));
      // test 'onattributechanged' event coming
      this.MockNavigatorBluetooth.callbacks[eventName][0](mockEvent);
      assert.equal(adapterManager.defaultAdapter,
        this.MockNavigatorBluetooth.defaultAdapter);
    });
  });

  suite('_initDefaultAdapter > ', function() {
    setup(function() {
      adapterManager.defaultAdapter = null;
    });

    test('defaultAdapter should be defined ', function() {
      adapterManager._initDefaultAdapter();
      assert.equal(adapterManager.defaultAdapter,
        this.MockNavigatorBluetooth.defaultAdapter);
    });
  });
});
