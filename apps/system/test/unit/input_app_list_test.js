'use strict';

/* global MockNavigatorMozSettings, MockNavigatorMozSettingsLock,
          MockEventTarget, MockDOMRequest, Promise,
          InputAppListSettings, InputAppList */

require('/shared/test/unit/mocks/mock_event_target.js');
require('/shared/test/unit/mocks/mock_dom_request.js');
require('/shared/js/input_mgmt/mock_navigator_mozsettings.js');

require('/shared/js/input_mgmt/input_app_list.js');

suite('InputAppListSettings', function() {
  var KEY = 'keyboard.3rd-party-app.enabled';

  var realMozSettings;
  var lockGetSpy;
  var settings;

  suiteSetup(function() {
    realMozSettings = navigator.mozSettings;
  });

  suiteTeardown(function() {
    navigator.mozSettings = realMozSettings;
  });

  setup(function() {
    var mozSettings = navigator.mozSettings = new MockNavigatorMozSettings();
    var createLockStub = this.sinon.stub(mozSettings, 'createLock');
    var addObserverSpy = this.sinon.spy(mozSettings, 'addObserver');
    var lock = new MockNavigatorMozSettingsLock();
    lockGetSpy = this.sinon.spy(lock, 'get');
    createLockStub.returns(lock);

    settings = new InputAppListSettings();
    settings.onchange = this.sinon.stub();
    settings.start();

    assert.isTrue(addObserverSpy.calledOnce);
    assert.isTrue(createLockStub.calledOnce);
    assert.isTrue(lockGetSpy.calledOnce);
    assert.isTrue(lockGetSpy.calledWith(KEY));
  });

  teardown(function() {
    var removeObserverSpy =
      this.sinon.spy(navigator.mozSettings, 'removeObserver');

    settings.stop();

    assert.isTrue(removeObserverSpy.calledOnce);
  });

  test('getSettings before ready', function(done) {
    var p = settings.getSettings();
    assert.isTrue(p instanceof Promise);

    var p2 = settings.getSettings();
    assert.equal(p, p2);

    var req = lockGetSpy.getCall(0).returnValue;
    var obj = {};
    obj[KEY] = true;
    req.fireSuccess(obj);

    p.then(function (val) {
      assert.isTrue(settings.ready);

      assert.deepEqual(val, { enable3rdPartyApps: true });
    }).then(done, done);
  });

  test('getSettings after ready', function(done) {
    var req = lockGetSpy.getCall(0).returnValue;
    var obj = {};
    obj[KEY] = true;
    req.fireSuccess(obj);

    settings.getSettings().then(function(val) {
      assert.isTrue(settings.ready);

      assert.deepEqual(settings.getSettings(), { enable3rdPartyApps: true });
    }).then(done, done);
  });

  test('Fail to get settings', function(done) {
    var req = lockGetSpy.getCall(0).returnValue;
    var error = {};
    req.fireError(error);

    settings.getSettings().then(function(val) {
      assert.isTrue(settings.ready);

      assert.deepEqual(val, { enable3rdPartyApps: false });
      assert.deepEqual(settings.getSettings(), { enable3rdPartyApps: false },
        'Set to false.');
    }).then(done, done);
  });

  test('Observer change', function() {
    navigator.mozSettings.dispatchSettingChange(KEY, false);

    assert.isTrue(settings.onchange.calledWith({ enable3rdPartyApps: false }));
  });
});

suite('InputAppList', function() {
  var KEY = 'keyboard.3rd-party-app.enabled';
  var INPUT_APP_MANIFEST = {
    manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp',
    manifest: {
      role: 'input',
      type: 'certified',
      inputs: {
        en: {
          types: ['url', 'text'],
          launch_path: '/index.html#en'
        },
        es: {
          types: ['url', 'text'],
          launch_path: '/index.html#es'
        },
        number: {
          types: ['number'],
          launch_path: '/index.html#number'
        }
      },
      permissions: {
        input: {}
      }
    }
  };

  var realMozApps;
  var MockMozAppsMgmt;

  var realMozSettings;
  var lockGetReq;
  var getAllReq;

  var list;

  suiteSetup(function() {
    realMozSettings = navigator.mozSettings;
    realMozApps = navigator.mozApps;

    // Minimal mock of mozApps.mgmt for ourselves
    MockMozAppsMgmt = function MockMozAppsMgmt() {};
    MockMozAppsMgmt.prototype = Object.create(MockEventTarget.prototype);
    MockMozAppsMgmt.prototype.getAll = function() {
      return new MockDOMRequest();
    };
  });

  suiteTeardown(function() {
    navigator.mozSettings = realMozSettings;
    navigator.mozApps = realMozApps;
  });


  setup(function() {
    navigator.mozApps = {
      mgmt: new MockMozAppsMgmt()
    };

    var getAllSpy = this.sinon.spy(navigator.mozApps.mgmt, 'getAll');

    var mozSettings = navigator.mozSettings = new MockNavigatorMozSettings();
    var createLockStub = this.sinon.stub(mozSettings, 'createLock');
    var lock = new MockNavigatorMozSettingsLock();
    var lockGetSpy = this.sinon.spy(lock, 'get');
    createLockStub.returns(lock);

    list = new InputAppList();
    list.start();

    lockGetReq = lockGetSpy.getCall(0).returnValue;
    getAllReq = getAllSpy.getCall(0).returnValue;
  });

  test('getList before ready', function(done) {
    list.getList().then(function(inputApps) {
      assert.deepEqual(inputApps, [ INPUT_APP_MANIFEST ]);
    }).then(done, done);

    var obj = {};
    obj[KEY] = true;
    lockGetReq.fireSuccess(obj);

    getAllReq.fireSuccess([
      INPUT_APP_MANIFEST
    ]);
  });

  suite('after ready', function(done) {
    setup(function(done) {
      var obj = {};
      obj[KEY] = true;
      lockGetReq.fireSuccess(obj);

      getAllReq.fireSuccess([
        INPUT_APP_MANIFEST
      ]);

      list.onready = function(inputApps) {
        return Promise.resolve().then(function() {
          assert.deepEqual(inputApps, [ INPUT_APP_MANIFEST ]);
        }).then(done, done);
      };
    });

    test('getList()', function(done) {
      list.getList().then(function(inputApps) {
        assert.deepEqual(inputApps, [ INPUT_APP_MANIFEST ]);
      }).then(done, done);
    });

    test('getListSync()', function() {
      var inputApps = list.getListSync();

      assert.deepEqual(inputApps, [ INPUT_APP_MANIFEST ]);
    });

    test('install app', function(done) {
      var newApp = Object.create(INPUT_APP_MANIFEST);
      newApp.manifestURL = 'app://myfunnykeyboard.org/manifest.webapp';

      list.onupdate = function(inputApps) {
        assert.deepEqual(inputApps, [ INPUT_APP_MANIFEST, newApp ]);
        assert.deepEqual(list.getListSync(), [ INPUT_APP_MANIFEST, newApp ]);

        done();
      };

      navigator.mozApps.mgmt.dispatchEvent({
        type: 'install',
        application: newApp
      });
    });

    test('install non-input app', function() {
      var newApp = Object.create(INPUT_APP_MANIFEST);
      newApp.manifest = Object.create(INPUT_APP_MANIFEST.manifest);

      newApp.manifestURL = 'app://myfunnykeyboard.org/manifest.webapp';
      newApp.manifest.role = undefined;

      list.onupdate = function(inputApps) {
        assert.isTrue(false, 'Should not call onupdate.');
      };

      navigator.mozApps.mgmt.dispatchEvent({
        type: 'install',
        application: newApp
      });

      assert.deepEqual(list.getListSync(), [ INPUT_APP_MANIFEST ]);
    });

    test('uninstall app', function(done) {
      list.onupdate = function(inputApps) {
        assert.deepEqual(inputApps, [ ]);
        assert.deepEqual(list.getListSync(), [ ]);

        done();
      };

      navigator.mozApps.mgmt.dispatchEvent({
        type: 'uninstall',
        application: INPUT_APP_MANIFEST
      });
    });
  });

  suite('input app checks w/ 3rd-party app enabled', function() {
    setup(function() {
      var obj = {};
      obj[KEY] = true;
      lockGetReq.fireSuccess(obj);
    });

    test('role=input', function(done) {
      var newApp = Object.create(INPUT_APP_MANIFEST);
      newApp.manifest = Object.create(INPUT_APP_MANIFEST.manifest);

      newApp.manifestURL = 'app://myfunnykeyboard.org/manifest.webapp';
      newApp.manifest.role = undefined;

      getAllReq.fireSuccess([ INPUT_APP_MANIFEST, newApp ]);

      list.getList().then(function(inputApps) {
        assert.deepEqual(inputApps, [ INPUT_APP_MANIFEST ]);
      }).then(done, done);
    });

    test('type=privileged', function(done) {
      var newApp = Object.create(INPUT_APP_MANIFEST);
      newApp.manifest = Object.create(INPUT_APP_MANIFEST.manifest);

      newApp.manifestURL = 'app://myfunnykeyboard.org/manifest.webapp';
      newApp.manifest.type = 'privileged';

      getAllReq.fireSuccess([ INPUT_APP_MANIFEST, newApp ]);

      list.getList().then(function(inputApps) {
        assert.deepEqual(inputApps, [ INPUT_APP_MANIFEST, newApp ]);
      }).then(done, done);
    });

    test('with input permission', function(done) {
      var newApp = Object.create(INPUT_APP_MANIFEST);
      newApp.manifest = Object.create(INPUT_APP_MANIFEST.manifest);

      newApp.manifestURL = 'app://myfunnykeyboard.org/manifest.webapp';
      newApp.manifest.permissions = {};

      getAllReq.fireSuccess([ INPUT_APP_MANIFEST, newApp ]);

      list.getList().then(function(inputApps) {
        assert.deepEqual(inputApps, [ INPUT_APP_MANIFEST ]);
      }).then(done, done);
    });

    test('with no inputs', function(done) {
      var newApp = Object.create(INPUT_APP_MANIFEST);
      newApp.manifest = Object.create(INPUT_APP_MANIFEST.manifest);

      newApp.manifestURL = 'app://myfunnykeyboard.org/manifest.webapp';
      newApp.manifest.inputs = undefined;

      getAllReq.fireSuccess([ INPUT_APP_MANIFEST, newApp ]);

      list.getList().then(function(inputApps) {
        assert.deepEqual(inputApps, [ INPUT_APP_MANIFEST ]);
      }).then(done, done);
    });
  });

  suite('input app checks w/ 3rd-party app disabled', function() {
    setup(function() {
      var obj = {};
      obj[KEY] = false;
      lockGetReq.fireSuccess(obj);
    });

    test('type=privileged', function(done) {
      var newApp = Object.create(INPUT_APP_MANIFEST);
      newApp.manifest = Object.create(INPUT_APP_MANIFEST.manifest);

      newApp.manifestURL = 'app://myfunnykeyboard.org/manifest.webapp';
      newApp.manifest.type = 'privileged';

      getAllReq.fireSuccess([ INPUT_APP_MANIFEST, newApp ]);

      list.getList().then(function(inputApps) {
        assert.deepEqual(inputApps, [ INPUT_APP_MANIFEST ]);
      }).then(done, done);
    });
  });

  test('setting changes', function(done) {
    var obj = {};
    obj[KEY] = false;
    lockGetReq.fireSuccess(obj);

    var newApp = Object.create(INPUT_APP_MANIFEST);
    newApp.manifest = Object.create(INPUT_APP_MANIFEST.manifest);

    newApp.manifestURL = 'app://myfunnykeyboard.org/manifest.webapp';
    newApp.manifest.type = 'privileged';

    getAllReq.fireSuccess([ INPUT_APP_MANIFEST, newApp ]);

    var updatePromise = new Promise(function(resolve) {
      list.onupdate = resolve;
    });

    list.getList().then(function(inputApps) {
      assert.deepEqual(inputApps, [ INPUT_APP_MANIFEST ]);
    }).then(function() {
      var p = updatePromise.then(function(inputApps) {
        assert.deepEqual(inputApps, [ INPUT_APP_MANIFEST, newApp ],
          'onupdate does not receive the right list');

        return list.getList().then(function(inputApps) {
          assert.deepEqual(inputApps, [ INPUT_APP_MANIFEST, newApp ],
            'getList() follows does not receive the right list');
        });
      });

      navigator.mozSettings.dispatchSettingChange(KEY, true);

      var getAllReq2 = navigator.mozApps.mgmt.getAll.getCall(1).returnValue;
      getAllReq2.fireSuccess([ INPUT_APP_MANIFEST, newApp ]);

      return p;
    }).then(done, done);
  });
});
