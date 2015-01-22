'use strict';

/* global MockNavigatorMozSettings, MockNavigatorMozSettingsLock,
          MockEventTarget, MockDOMRequest, Promise,
          InputAppListSettings, InputAppList */

require('/shared/test/unit/mocks/mock_event_target.js');
require('/shared/test/unit/mocks/mock_dom_request.js');
require('/shared/js/input_mgmt/mock_navigator_mozsettings.js');

require('/shared/js/input_mgmt/input_app_list.js');

var KEY_THIRD_PARTY_APP_ENABLED = 'keyboard.3rd-party-app.enabled';
var KEY_DYNAMIC_INPUTS = 'keyboard.dynamic-inputs';

suite('InputAppListSettings', function() {
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

    assert.isTrue(addObserverSpy.calledTwice);
    assert.isTrue(createLockStub.calledOnce);
    assert.isTrue(lockGetSpy.calledTwice);
    assert.isTrue(lockGetSpy.firstCall.calledWith(KEY_THIRD_PARTY_APP_ENABLED));
    assert.isTrue(lockGetSpy.secondCall.calledWith(KEY_DYNAMIC_INPUTS));
  });

  teardown(function() {
    var removeObserverSpy =
      this.sinon.spy(navigator.mozSettings, 'removeObserver');

    settings.stop();

    assert.isTrue(removeObserverSpy.calledTwice);
  });

  test('getSettings before ready', function(done) {
    var p = settings.getSettings();
    assert.isTrue(p instanceof Promise);

    var p2 = settings.getSettings();
    assert.equal(p, p2);

    var req = lockGetSpy.getCall(0).returnValue;
    var obj = {};
    obj[KEY_THIRD_PARTY_APP_ENABLED] = true;
    req.fireSuccess(obj);

    var req2 = lockGetSpy.getCall(1).returnValue;
    var obj2 = {};
    obj2[KEY_DYNAMIC_INPUTS] = {};
    req2.fireSuccess(obj2);

    p.then(function (val) {
      assert.isTrue(settings.ready);
      assert.deepEqual(val, {
        enable3rdPartyApps: true,
        dynamicInputs: {} });
    }).then(done, done);
  });

  test('getSettings after ready', function(done) {
    var req = lockGetSpy.getCall(0).returnValue;
    var obj = {};
    obj[KEY_THIRD_PARTY_APP_ENABLED] = true;
    req.fireSuccess(obj);

    var req2 = lockGetSpy.getCall(1).returnValue;
    var obj2 = {};
    obj2[KEY_DYNAMIC_INPUTS] = {};
    req2.fireSuccess(obj2);

    settings.getSettings().then(function(val) {
      assert.isTrue(settings.ready);

      assert.deepEqual(settings.getSettings(), {
        enable3rdPartyApps: true,
        dynamicInputs: {} });
    }).then(done, done);
  });

  test('Fail to get settings', function(done) {
    var req = lockGetSpy.getCall(0).returnValue;
    var error = {};
    req.fireError(error);

    var req2 = lockGetSpy.getCall(1).returnValue;
    var error2 = {};
    req2.fireError(error2);

    settings.getSettings().then(function(val) {
      assert.isTrue(settings.ready);

      assert.deepEqual(val, {
        enable3rdPartyApps: false,
        dynamicInputs: {} });
      assert.deepEqual(settings.getSettings(), {
        enable3rdPartyApps: false,
        dynamicInputs: {} }, 'Set to false and empty.');
    }).then(done, done);
  });

  test('Observer change to KEY_THIRD_PARTY_APP_ENABLED', function() {
    navigator.mozSettings.dispatchSettingChange(
      KEY_THIRD_PARTY_APP_ENABLED, false);

    assert.isTrue(settings.onchange.calledWith({
      enable3rdPartyApps: false,
      dynamicInputs: undefined }));
  });

  test('Observer change to KEY_DYNAMIC_INPUTS', function() {
    navigator.mozSettings.dispatchSettingChange(
      KEY_DYNAMIC_INPUTS, {});

    assert.isTrue(settings.onchange.calledWith({
      enable3rdPartyApps: undefined,
      dynamicInputs: {} }));
  });
});

suite('InputAppList', function() {
  var INPUT_APP = {
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
  var lockGetReq2;
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
    lockGetReq2 = lockGetSpy.getCall(1).returnValue;
    getAllReq = getAllSpy.getCall(0).returnValue;
  });

  test('getList before ready', function(done) {
    list.getList().then(function(inputApps) {
      assert.deepEqual(inputApps, [ INPUT_APP ]);
    }).then(done, done);

    var obj = {};
    obj[KEY_THIRD_PARTY_APP_ENABLED] = true;
    lockGetReq.fireSuccess(obj);

    var obj2 = {};
    obj2[KEY_DYNAMIC_INPUTS] = {};
    lockGetReq2.fireSuccess(obj2);

    getAllReq.fireSuccess([
      INPUT_APP
    ]);
  });

  suite('after ready', function(done) {
    setup(function(done) {
      var obj = {};
      obj[KEY_THIRD_PARTY_APP_ENABLED] = true;
      lockGetReq.fireSuccess(obj);

      var obj2 = {};
      obj2[KEY_DYNAMIC_INPUTS] = {};
      lockGetReq2.fireSuccess(obj2);

      getAllReq.fireSuccess([
        INPUT_APP
      ]);

      list.onready = function(inputApps) {
        return Promise.resolve().then(function() {
          assert.deepEqual(inputApps, [ INPUT_APP ]);
        }).then(done, done);
      };
    });

    test('getList()', function(done) {
      list.getList().then(function(inputApps) {
        assert.deepEqual(inputApps, [ INPUT_APP ]);
      }).then(done, done);
    });

    test('getListSync()', function() {
      var inputApps = list.getListSync();

      assert.deepEqual(inputApps, [ INPUT_APP ]);
    });

    test('install app', function(done) {
      var newApp = Object.create(INPUT_APP);
      newApp.manifestURL = 'app://myfunnykeyboard.org/manifest.webapp';

      list.onupdate = function(inputApps) {
        assert.deepEqual(inputApps, [ INPUT_APP, newApp ]);
        assert.deepEqual(list.getListSync(), [ INPUT_APP, newApp ]);

        done();
      };

      navigator.mozApps.mgmt.dispatchEvent({
        type: 'install',
        application: newApp
      });
    });

    test('install app -- mark as downloading', function(done) {
      var newApp = Object.create(INPUT_APP);
      var manifest = newApp.manifest;

      newApp.manifestURL = 'app://myfunnykeyboard.org/manifest.webapp';
      newApp.downloading = true;
      newApp.manifest = undefined;

      // XXX: newApp should be a MockEventTarget instance,
      // but we are too lazy to make a real MockDOMApplication here.
      newApp.addEventListener = this.sinon.stub();

      list.onupdate = function(inputApps) {
        assert.deepEqual(inputApps, [ INPUT_APP, newApp ]);
        assert.deepEqual(list.getListSync(), [ INPUT_APP, newApp ]);

        done();
      };

      navigator.mozApps.mgmt.dispatchEvent({
        type: 'install',
        application: newApp
      });

      assert.isTrue(
        newApp.addEventListener.calledWith('downloadsuccess', list));

      newApp.downloading = false;
      newApp.manifest = manifest;

      list.handleEvent({
        type: 'downloadsuccess',
        target: newApp
      });
    });

    test('install non-input app', function() {
      var newApp = Object.create(INPUT_APP);
      newApp.manifest = Object.create(INPUT_APP.manifest);

      newApp.manifestURL = 'app://myfunnykeyboard.org/manifest.webapp';
      newApp.manifest.role = undefined;

      list.onupdate = function(inputApps) {
        assert.isTrue(false, 'Should not call onupdate.');
      };

      navigator.mozApps.mgmt.dispatchEvent({
        type: 'install',
        application: newApp
      });

      assert.deepEqual(list.getListSync(), [ INPUT_APP ]);
    });

    test('uninstall app', function(done) {
      list.onupdate = function(inputApps) {
        assert.deepEqual(inputApps, [ ]);
        assert.deepEqual(list.getListSync(), [ ]);

        done();
      };

      navigator.mozApps.mgmt.dispatchEvent({
        type: 'uninstall',
        application: INPUT_APP
      });
    });
  });

  suite('input app checks w/ 3rd-party app enabled', function() {
    setup(function() {
      var obj = {};
      obj[KEY_THIRD_PARTY_APP_ENABLED] = true;
      lockGetReq.fireSuccess(obj);

      var obj2 = {};
      obj2[KEY_DYNAMIC_INPUTS] = {};
      lockGetReq2.fireSuccess(obj2);
    });

    test('role=input', function(done) {
      var newApp = Object.create(INPUT_APP);
      newApp.manifest = Object.create(INPUT_APP.manifest);

      newApp.manifestURL = 'app://myfunnykeyboard.org/manifest.webapp';
      newApp.manifest.role = undefined;

      getAllReq.fireSuccess([ INPUT_APP, newApp ]);

      list.getList().then(function(inputApps) {
        assert.deepEqual(inputApps, [ INPUT_APP ]);
      }).then(done, done);
    });

    test('type=privileged', function(done) {
      var newApp = Object.create(INPUT_APP);
      newApp.manifest = Object.create(INPUT_APP.manifest);

      newApp.manifestURL = 'app://myfunnykeyboard.org/manifest.webapp';
      newApp.manifest.type = 'privileged';

      getAllReq.fireSuccess([ INPUT_APP, newApp ]);

      list.getList().then(function(inputApps) {
        assert.deepEqual(inputApps, [ INPUT_APP, newApp ]);
      }).then(done, done);
    });

    test('with input permission', function(done) {
      var newApp = Object.create(INPUT_APP);
      newApp.manifest = Object.create(INPUT_APP.manifest);

      newApp.manifestURL = 'app://myfunnykeyboard.org/manifest.webapp';
      newApp.manifest.permissions = {};

      getAllReq.fireSuccess([ INPUT_APP, newApp ]);

      list.getList().then(function(inputApps) {
        assert.deepEqual(inputApps, [ INPUT_APP ]);
      }).then(done, done);
    });

    test('with no inputs', function(done) {
      var newApp = Object.create(INPUT_APP);
      newApp.manifest = Object.create(INPUT_APP.manifest);

      newApp.manifestURL = 'app://myfunnykeyboard.org/manifest.webapp';
      newApp.manifest.inputs = undefined;

      getAllReq.fireSuccess([ INPUT_APP, newApp ]);

      list.getList().then(function(inputApps) {
        assert.deepEqual(inputApps, [ INPUT_APP ]);
      }).then(done, done);
    });
  });

  suite('input app checks w/ 3rd-party app disabled', function() {
    setup(function() {
      var obj = {};
      obj[KEY_THIRD_PARTY_APP_ENABLED] = false;
      lockGetReq.fireSuccess(obj);

      var obj2 = {};
      obj2[KEY_DYNAMIC_INPUTS] = {};
      lockGetReq2.fireSuccess(obj2);
    });

    test('type=privileged', function(done) {
      var newApp = Object.create(INPUT_APP);
      newApp.manifest = Object.create(INPUT_APP.manifest);

      newApp.manifestURL = 'app://myfunnykeyboard.org/manifest.webapp';
      newApp.manifest.type = 'privileged';

      getAllReq.fireSuccess([ INPUT_APP, newApp ]);

      list.getList().then(function(inputApps) {
        assert.deepEqual(inputApps, [ INPUT_APP ]);
      }).then(done, done);
    });
  });

  test('insert dynamic inputs', function(done) {
    var newApp = Object.create(INPUT_APP);
    newApp.manifest = Object.create(INPUT_APP.manifest);
    newApp.manifest.inputs = Object.create(INPUT_APP.manifest.inputs);
    var FOO_INPUT_MANIFEST = newApp.manifest.inputs.foo = {
      types: ['url', 'text'],
      launch_path: '/index.html#foo'
    };

    list.getList().then(function(inputApps) {
      assert.deepEqual(inputApps, [ newApp ]);
    }).then(done, done);

    var obj = {};
    obj[KEY_THIRD_PARTY_APP_ENABLED] = true;
    lockGetReq.fireSuccess(obj);

    var obj2 = {};
    obj2[KEY_DYNAMIC_INPUTS] = {
      'app://keyboard.gaiamobile.org/manifest.webapp': {
        foo: FOO_INPUT_MANIFEST
      }
    };
    lockGetReq2.fireSuccess(obj2);

    getAllReq.fireSuccess([ INPUT_APP ]);
  });

  test('KEY_THIRD_PARTY_APP_ENABLED setting changes', function(done) {
    var obj = {};
    obj[KEY_THIRD_PARTY_APP_ENABLED] = false;
    lockGetReq.fireSuccess(obj);

    var obj2 = {};
    obj2[KEY_DYNAMIC_INPUTS] = {};
    lockGetReq2.fireSuccess(obj2);

    var newApp = Object.create(INPUT_APP);
    newApp.manifest = Object.create(INPUT_APP.manifest);

    newApp.manifestURL = 'app://myfunnykeyboard.org/manifest.webapp';
    newApp.manifest.type = 'privileged';

    getAllReq.fireSuccess([ INPUT_APP, newApp ]);

    var updatePromise = new Promise(function(resolve) {
      list.onupdate = resolve;
    });

    list.getList().then(function(inputApps) {
      assert.deepEqual(inputApps, [ INPUT_APP ]);
    }).then(function() {
      var p = updatePromise.then(function(inputApps) {
        assert.deepEqual(inputApps, [ INPUT_APP, newApp ],
          'onupdate does not receive the right list');

        return list.getList().then(function(inputApps) {
          assert.deepEqual(inputApps, [ INPUT_APP, newApp ],
            'getList() follows does not receive the right list');
        });
      });

      navigator.mozSettings.dispatchSettingChange(
        KEY_THIRD_PARTY_APP_ENABLED, true);

      var getAllReq2 = navigator.mozApps.mgmt.getAll.getCall(1).returnValue;
      getAllReq2.fireSuccess([ INPUT_APP, newApp ]);

      return p;
    }).then(done, done);
  });

  test('KEY_DYNAMIC_INPUTS setting changes: add an input', function(done) {
    var obj = {};
    obj[KEY_THIRD_PARTY_APP_ENABLED] = true;
    lockGetReq.fireSuccess(obj);

    var obj2 = {};
    obj2[KEY_DYNAMIC_INPUTS] = {};
    lockGetReq2.fireSuccess(obj2);

    var newApp = Object.create(INPUT_APP);
    newApp.manifest = Object.create(INPUT_APP.manifest);
    newApp.manifest.inputs = Object.create(INPUT_APP.manifest.inputs);
    var FOO_INPUT_MANIFEST = newApp.manifest.inputs.foo = {
      types: ['url', 'text'],
      launch_path: '/index.html#foo'
    };

    getAllReq.fireSuccess([ INPUT_APP ]);

    var updatePromise = new Promise(function(resolve) {
      list.onupdate = resolve;
    });

    list.getList().then(function(inputApps) {
      assert.deepEqual(inputApps, [ INPUT_APP ]);
    }).then(function() {
      var p = updatePromise.then(function(inputApps) {
        assert.deepEqual(inputApps, [ newApp ],
          'onupdate does not receive the right list');

        return list.getList().then(function(inputApps) {
          assert.deepEqual(inputApps, [ newApp ],
            'getList() follows does not receive the right list');
        });
      });

      navigator.mozSettings.dispatchSettingChange(
        KEY_DYNAMIC_INPUTS, {
          'app://keyboard.gaiamobile.org/manifest.webapp': {
            foo: FOO_INPUT_MANIFEST
          }
        });

      var getAllReq2 = navigator.mozApps.mgmt.getAll.getCall(1).returnValue;
      getAllReq2.fireSuccess([ INPUT_APP ]);

      return p;
    }).then(done, done);
  });

  test('KEY_DYNAMIC_INPUTS setting changes: remove an input', function(done) {
    var FOO_INPUT_MANIFEST = {
      types: ['url', 'text'],
      launch_path: '/index.html#foo'
    };

    var obj = {};
    obj[KEY_THIRD_PARTY_APP_ENABLED] = true;
    lockGetReq.fireSuccess(obj);

    var obj2 = {};
    obj2[KEY_DYNAMIC_INPUTS] = {
      'app://keyboard.gaiamobile.org/manifest.webapp': {
        foo: FOO_INPUT_MANIFEST
      }
    };
    lockGetReq2.fireSuccess(obj2);

    var newApp = Object.create(INPUT_APP);
    newApp.manifest = Object.create(INPUT_APP.manifest);
    newApp.manifest.inputs = Object.create(INPUT_APP.manifest.inputs);
    newApp.manifest.inputs.foo = FOO_INPUT_MANIFEST;

    getAllReq.fireSuccess([ INPUT_APP ]);

    var updatePromise = new Promise(function(resolve) {
      list.onupdate = resolve;
    });

    list.getList().then(function(inputApps) {
      assert.deepEqual(inputApps, [ newApp ]);
      assert.isTrue('foo' in INPUT_APP.manifest.inputs,
        'Modified object in place.');
    }).then(function() {
      var p = updatePromise.then(function(inputApps) {
        assert.deepEqual(inputApps, [ INPUT_APP ],
          'onupdate does not receive the right list');

        return list.getList().then(function(inputApps) {
          assert.deepEqual(inputApps, [ INPUT_APP ],
            'getList() follows does not receive the right list');
          assert.isFalse('foo' in INPUT_APP.manifest.inputs,
            'Does not remove modification in place.');
        });
      });

      navigator.mozSettings.dispatchSettingChange(KEY_DYNAMIC_INPUTS, {});

      var getAllReq2 = navigator.mozApps.mgmt.getAll.getCall(1).returnValue;
      getAllReq2.fireSuccess([ INPUT_APP ]);

      return p;
    }).then(done, done);
  });
});
