'use strict';

/* global MockNavigatorMozSettings, MockNavigatorMozSettingsLock,
          MockEventTarget, MockDOMRequest, Promise,
          InputAppListSettings, InputAppList, InputApp */

require('/shared/test/unit/mocks/mock_event_target.js');
require('/shared/test/unit/mocks/mock_dom_request.js');
require('/shared/js/input_mgmt/mock_navigator_mozsettings.js');

require('/shared/js/input_mgmt/input_app_list.js');

var KEY_THIRD_PARTY_APP_ENABLED = 'keyboard.3rd-party-app.enabled';
var KEY_DYNAMIC_INPUTS = 'keyboard.dynamic-inputs';

var MOCK_DOM_APP = {
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
  var realMozApps;
  var MockMozAppsMgmt;

  var realMozSettings;
  var lockGetReq;
  var lockGetReq2;
  var getAllReq;

  var list;

  var inputApp;
  var domApp;

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

    domApp = Object.create(MOCK_DOM_APP);
    inputApp = new InputApp(domApp);

    lockGetReq = lockGetSpy.getCall(0).returnValue;
    lockGetReq2 = lockGetSpy.getCall(1).returnValue;
    getAllReq = getAllSpy.getCall(0).returnValue;
  });

  test('getList before ready', function(done) {
    list.getList().then(function(inputApps) {
      assert.deepEqual(inputApps, [ inputApp ]);
    }).then(done, done);

    var obj = {};
    obj[KEY_THIRD_PARTY_APP_ENABLED] = true;
    lockGetReq.fireSuccess(obj);

    var obj2 = {};
    obj2[KEY_DYNAMIC_INPUTS] = {};
    lockGetReq2.fireSuccess(obj2);

    getAllReq.fireSuccess([ domApp ]);
  });

  suite('after ready', function(done) {
    setup(function(done) {
      var obj = {};
      obj[KEY_THIRD_PARTY_APP_ENABLED] = true;
      lockGetReq.fireSuccess(obj);

      var obj2 = {};
      obj2[KEY_DYNAMIC_INPUTS] = {};
      lockGetReq2.fireSuccess(obj2);

      getAllReq.fireSuccess([ domApp ]);

      list.onready = function(inputApps) {
        return Promise.resolve().then(function() {
          assert.deepEqual(inputApps, [ inputApp ]);
        }).then(done, done);
      };
    });

    test('getList()', function(done) {
      list.getList().then(function(inputApps) {
        assert.deepEqual(inputApps, [ inputApp ]);
      }).then(done, done);
    });

    test('getListSync()', function() {
      var inputApps = list.getListSync();

      assert.deepEqual(inputApps, [ inputApp ]);
    });

    test('install app', function(done) {
      var newDomApp = Object.create(MOCK_DOM_APP);
      newDomApp.manifestURL = 'app://myfunnykeyboard.org/manifest.webapp';
      var newInputApp = new InputApp(newDomApp);

      list.onupdate = function(inputApps) {
        assert.deepEqual(inputApps, [ inputApp, newInputApp ]);
        assert.deepEqual(list.getListSync(), [ inputApp, newInputApp ]);

        done();
      };

      navigator.mozApps.mgmt.dispatchEvent({
        type: 'install',
        application: newDomApp
      });
    });

    test('install app -- mark as downloading', function(done) {
      var newDomApp = Object.create(MOCK_DOM_APP);
      var newInputApp = new InputApp(newDomApp);

      var manifest = newDomApp.manifest;
      newDomApp.manifestURL = 'app://myfunnykeyboard.org/manifest.webapp';
      newDomApp.downloading = true;
      newDomApp.manifest = undefined;

      // XXX: newDomApp should be a MockEventTarget instance,
      // but we are too lazy to make a real MockDOMApplication here.
      newDomApp.addEventListener = this.sinon.stub();

      list.onupdate = function(inputApps) {
        assert.deepEqual(inputApps, [ inputApp, newInputApp ]);
        assert.deepEqual(list.getListSync(), [ inputApp, newInputApp ]);

        done();
      };

      navigator.mozApps.mgmt.dispatchEvent({
        type: 'install',
        application: newDomApp
      });

      assert.isTrue(
        newDomApp.addEventListener.calledWith('downloadsuccess', list));

      newDomApp.downloading = false;
      newDomApp.manifest = manifest;

      list.handleEvent({
        type: 'downloadsuccess',
        target: newDomApp
      });
    });

    test('install non-input app', function() {
      var newDomApp = Object.create(MOCK_DOM_APP);
      newDomApp.manifest = Object.create(MOCK_DOM_APP.manifest);

      newDomApp.manifestURL = 'app://myfunnykeyboard.org/manifest.webapp';
      newDomApp.manifest.role = undefined;

      list.onupdate = function(inputApps) {
        assert.isTrue(false, 'Should not call onupdate.');
      };

      navigator.mozApps.mgmt.dispatchEvent({
        type: 'install',
        application: newDomApp
      });

      assert.deepEqual(list.getListSync(), [ inputApp ]);
    });

    test('uninstall app', function(done) {
      list.onupdate = function(inputApps) {
        assert.deepEqual(inputApps, [ ]);
        assert.deepEqual(list.getListSync(), [ ]);

        done();
      };

      navigator.mozApps.mgmt.dispatchEvent({
        type: 'uninstall',
        application: domApp
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
      var newDomApp = Object.create(MOCK_DOM_APP);
      newDomApp.manifest = Object.create(MOCK_DOM_APP.manifest);

      newDomApp.manifestURL = 'app://myfunnykeyboard.org/manifest.webapp';
      newDomApp.manifest.role = undefined;

      getAllReq.fireSuccess([ domApp, newDomApp ]);

      list.getList().then(function(inputApps) {
        assert.deepEqual(inputApps, [ inputApp ]);
      }).then(done, done);
    });

    test('type=privileged', function(done) {
      var newDomApp = Object.create(MOCK_DOM_APP);
      newDomApp.manifest = Object.create(MOCK_DOM_APP.manifest);

      newDomApp.manifestURL = 'app://myfunnykeyboard.org/manifest.webapp';
      newDomApp.manifest.type = 'privileged';

      var newInputApp = new InputApp(newDomApp);

      getAllReq.fireSuccess([ domApp, newDomApp ]);

      list.getList().then(function(inputApps) {
        assert.deepEqual(inputApps, [ inputApp, newInputApp ]);
      }).then(done, done);
    });

    test('without input permission', function(done) {
      var newDomApp = Object.create(MOCK_DOM_APP);
      newDomApp.manifest = Object.create(MOCK_DOM_APP.manifest);

      newDomApp.manifestURL = 'app://myfunnykeyboard.org/manifest.webapp';
      newDomApp.manifest.permissions = {};

      getAllReq.fireSuccess([ domApp, newDomApp ]);

      list.getList().then(function(inputApps) {
        assert.deepEqual(inputApps, [ inputApp ]);
      }).then(done, done);
    });

    test('with no inputs', function(done) {
      var newDomApp = Object.create(MOCK_DOM_APP);
      newDomApp.manifest = Object.create(MOCK_DOM_APP.manifest);

      newDomApp.manifestURL = 'app://myfunnykeyboard.org/manifest.webapp';
      newDomApp.manifest.inputs = undefined;

      getAllReq.fireSuccess([ domApp, newDomApp ]);

      list.getList().then(function(inputApps) {
        assert.deepEqual(inputApps, [ inputApp ]);
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
      var newDomApp = Object.create(MOCK_DOM_APP);
      newDomApp.manifest = Object.create(MOCK_DOM_APP.manifest);

      newDomApp.manifestURL = 'app://myfunnykeyboard.org/manifest.webapp';
      newDomApp.manifest.type = 'privileged';

      getAllReq.fireSuccess([ domApp, newDomApp ]);

      list.getList().then(function(inputApps) {
        assert.deepEqual(inputApps, [ inputApp ]);
      }).then(done, done);
    });
  });

  test('insert dynamic inputs', function(done) {
    var FOO_INPUT_MANIFEST = {
      types: ['url', 'text'],
      launch_path: '/index.html#foo'
    };

    inputApp = new InputApp(domApp, {
      foo: FOO_INPUT_MANIFEST
    });

    list.getList().then(function(inputApps) {
      assert.deepEqual(inputApps, [ inputApp ]);
      assert.deepEqual(inputApps[0].getInputs(), inputApp.getInputs());
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

    getAllReq.fireSuccess([ domApp ]);
  });

  test('KEY_THIRD_PARTY_APP_ENABLED setting changes', function(done) {
    var obj = {};
    obj[KEY_THIRD_PARTY_APP_ENABLED] = false;
    lockGetReq.fireSuccess(obj);

    var obj2 = {};
    obj2[KEY_DYNAMIC_INPUTS] = {};
    lockGetReq2.fireSuccess(obj2);

    var newDomApp = Object.create(MOCK_DOM_APP);
    newDomApp.manifestURL = 'app://myfunnykeyboard.org/manifest.webapp';
    newDomApp.manifest = Object.create(MOCK_DOM_APP.manifest);
    newDomApp.manifest.type = 'privileged';

    var newInputApp = new InputApp(newDomApp);

    getAllReq.fireSuccess([ domApp, newDomApp ]);

    list.getList().then(function(inputApps) {
      assert.deepEqual(inputApps, [ inputApp ]);
    }).then(function() {
      navigator.mozSettings.dispatchSettingChange(
        KEY_THIRD_PARTY_APP_ENABLED, true);

      var getAllReq2 = navigator.mozApps.mgmt.getAll.getCall(1).returnValue;
      getAllReq2.fireSuccess([ domApp, newDomApp ]);
    }).then(function() {
      return new Promise(function(resolve) {
        list.onupdate = resolve;
      });
    }).then(function(inputApps) {
      assert.deepEqual(inputApps, [ inputApp, newInputApp ],
        'onupdate does not receive the right list');
    }).then(function() {
      return list.getList();
    }).then(function(inputApps) {
      assert.deepEqual(inputApps, [ inputApp, newInputApp ],
        'getList() follows does not receive the right list');
    }).then(done, done);
  });

  test('KEY_DYNAMIC_INPUTS setting changes: add an input', function(done) {
    var obj = {};
    obj[KEY_THIRD_PARTY_APP_ENABLED] = true;
    lockGetReq.fireSuccess(obj);

    var obj2 = {};
    obj2[KEY_DYNAMIC_INPUTS] = {};
    lockGetReq2.fireSuccess(obj2);

    getAllReq.fireSuccess([ domApp ]);

    var FOO_INPUT_MANIFEST = {
      types: ['url', 'text'],
      launch_path: '/index.html#foo'
    };

    var inputApp2 = new InputApp(domApp, {
      foo: FOO_INPUT_MANIFEST
    });

    list.getList().then(function(inputApps) {
      assert.deepEqual(inputApps, [ inputApp ]);
    }).then(function() {
      navigator.mozSettings.dispatchSettingChange(
        KEY_DYNAMIC_INPUTS, {
          'app://keyboard.gaiamobile.org/manifest.webapp': {
            foo: FOO_INPUT_MANIFEST
          }
        });

      var getAllReq2 = navigator.mozApps.mgmt.getAll.getCall(1).returnValue;
      getAllReq2.fireSuccess([ domApp ]);
    }).then(function() {
      return new Promise(function(resolve) {
        list.onupdate = resolve;
      });
    }).then(function(inputApps) {
      assert.deepEqual(inputApps, [ inputApp2 ],
        'onupdate does not receive the right list');

      var inputs = {};
      for (var inputId in domApp.manifest.inputs) {
        inputs[inputId] = domApp.manifest.inputs[inputId];
      }
      inputs.foo = FOO_INPUT_MANIFEST;

      assert.deepEqual(inputApps[0].getInputs(), inputs);
    }).then(function() {
      return list.getList();
    }).then(function(inputApps) {
      assert.deepEqual(inputApps, [ inputApp2 ],
        'getList() follows does not receive the right list');

      var inputs = {};
      for (var inputId in domApp.manifest.inputs) {
        inputs[inputId] = domApp.manifest.inputs[inputId];
      }
      inputs.foo = FOO_INPUT_MANIFEST;

      assert.deepEqual(inputApps[0].getInputs(), inputs);
    }).then(done, done);
  });

  test('KEY_DYNAMIC_INPUTS setting changes: remove an input', function(done) {
    var FOO_INPUT_MANIFEST = {
      types: ['url', 'text'],
      launch_path: '/index.html#foo'
    };

    var inputApp2 = new InputApp(domApp, {
      foo: FOO_INPUT_MANIFEST
    });

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

    getAllReq.fireSuccess([ domApp ]);

    list.getList().then(function(inputApps) {
      assert.deepEqual(inputApps, [ inputApp2 ]);

      assert.deepEqual(inputApps[0].getInputs(), inputApp2.getInputs());
    }).then(function() {
      navigator.mozSettings.dispatchSettingChange(KEY_DYNAMIC_INPUTS, {});

      var getAllReq2 = navigator.mozApps.mgmt.getAll.getCall(1).returnValue;
      getAllReq2.fireSuccess([ domApp ]);
    }).then(function() {
      return new Promise(function(resolve) {
        list.onupdate = resolve;
      });
    }).then(function(inputApps) {
      assert.deepEqual(inputApps, [ inputApp ],
        'onupdate does not receive the right list');

      assert.deepEqual(inputApps[0].getInputs(), inputApp.getInputs());
    }).then(function() {
      return list.getList();
    }).then(function(inputApps) {
      assert.deepEqual(inputApps, [ inputApp ],
        'getList() follows does not receive the right list');

      assert.deepEqual(inputApps[0].getInputs(), inputApp.getInputs());
    }).then(done, done);
  });
});

suite('InputApp', function() {
  var domApp;

  setup(function() {
    domApp = Object.create(MOCK_DOM_APP);
  });

  test('construct w/o dynamic input', function() {
    var inputApp = new InputApp(domApp);

    assert.equal(inputApp.domApp, domApp);
    assert.deepEqual(inputApp.dynamicInputs, {});

    assert.deepEqual(inputApp.getInputs(), domApp.manifest.inputs);
  });

  test('construct w/ dynamic input', function() {
    var FOO_INPUT_MANIFEST = {
      types: ['url', 'text'],
      launch_path: '/index.html#foo'
    };

    var inputApp = new InputApp(domApp, { foo: FOO_INPUT_MANIFEST });

    assert.equal(inputApp.domApp, domApp);
    assert.deepEqual(inputApp.dynamicInputs, { foo: FOO_INPUT_MANIFEST });

    var inputs = {};
    for (var inputId in domApp.manifest.inputs) {
      inputs[inputId] = domApp.manifest.inputs[inputId];
    }
    inputs.foo = FOO_INPUT_MANIFEST;

    assert.deepEqual(inputApp.getInputs(), inputs);
  });
});
