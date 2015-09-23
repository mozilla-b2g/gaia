'use strict';

/* global DynamicInputRegistry, InputAppList, InputApp,
          MockNavigatorMozSettings, MockNavigatorMozSettingsLock,
          MockDOMRequest, MockEventTarget */

require('/shared/test/unit/mocks/mock_event_target.js');
require('/shared/test/unit/mocks/mock_dom_request.js');
require('/shared/js/input_mgmt/mock_navigator_mozsettings.js');
require('/shared/test/unit/mocks/mock_event_target.js');

require('/shared/js/input_mgmt/input_app_list.js');
require('/js/dynamic_input_registry.js');

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

suite('DynamicInputRegistry', function(){
  var realMozSettings;
  var realMozInputMethod;
  var lockGetStub;
  var lockSetStub;

  var registry;

  var domApp;
  var inputApp;

  var getResult;
  var setResult;

  suiteSetup(function() {
    realMozSettings = navigator.mozSettings;
  });

  suiteTeardown(function() {
    navigator.mozSettings = realMozSettings;
  });

  setup(function(done) {
    var mozSettings = navigator.mozSettings = new MockNavigatorMozSettings();
    navigator.mozInputMethod = {
      mgmt: new MockEventTarget()
    };

    var createLockStub = this.sinon.stub(mozSettings, 'createLock');
    var lock = new MockNavigatorMozSettingsLock();

    lockGetStub = this.sinon.stub(lock, 'get', function() {
      var req = new MockDOMRequest();
      Promise.resolve().then(function() {
        if ('result' in getResult) {
          req.fireSuccess(getResult.result);
        } else {
          req.fireError(getResult.error);
        }
      });
      return req;
    });
    lockSetStub = this.sinon.stub(lock, 'set', function() {
      var req = new MockDOMRequest();
      Promise.resolve().then(function() {
        if ('result' in setResult) {
          req.fireSuccess(setResult.result);
        } else {
          req.fireError(setResult.error);
        }
      });
      return req;
    });
    createLockStub.returns(lock);

    this.sinon.spy(window, 'addEventListener');
    this.sinon.spy(window, 'removeEventListener');

    domApp = Object.create(MOCK_DOM_APP);
    inputApp = new InputApp(domApp);

    var stubInputAppList =
      this.sinon.stub(Object.create(InputAppList.prototype));
    stubInputAppList.getList.returns([ inputApp ]);
    window.KeyboardHelper = {
      inputAppList: stubInputAppList
    };

    registry = new DynamicInputRegistry();
    registry.start();

    registry.taskQueue.then(done, done);
  });

  teardown(function() {
    registry.stop();

    navigator.mozInputMethod = realMozInputMethod;
  });

  suite('inputregistry-add', function() {
    test('add an input', function(done) {
      var evt = {
        type: 'addinputrequest',
        detail: {
          id: 1,
          manifestURL: domApp.manifestURL,
          inputId: 'foo',
          inputManifest: {
            types: ['url', 'text'],
            launch_path: '/index.html#foo'
          },
          waitUntil: this.sinon.stub()
        },
        preventDefault: this.sinon.stub()
      };

      navigator.mozInputMethod.mgmt.dispatchEvent(evt);

      var obj = {};
      obj[registry.SETTING_KEY] = {};
      getResult = { result: obj };
      setResult = { result: undefined };

      assert.isTrue(evt.preventDefault.calledOnce);

      registry.taskQueue.then(function() {
        assert.isTrue(lockSetStub.calledWith({
          'keyboard.dynamic-inputs': {
            'app://keyboard.gaiamobile.org/manifest.webapp': {
              foo: {
                types: ['url', 'text'],
                launch_path: '/index.html#foo'
              }
            }
          }
        }));

        assert.isTrue(evt.detail.waitUntil.calledOnce);
        return evt.detail.waitUntil.firstCall.args[0];
      }).then(function(p) {
        assert.ok(true, 'resolved');
      }, function(e) {
        throw e || 'Should not reject.';
      }).then(done, done);
    });

    test('fail to get settings', function(done) {
      var evt = {
        type: 'addinputrequest',
        detail: {
          id: 1,
          manifestURL: domApp.manifestURL,
          inputId: 'foo',
          inputManifest: {
            types: ['url', 'text'],
            launch_path: '/index.html#foo'
          },
          waitUntil: this.sinon.stub()
        },
        preventDefault: this.sinon.stub()
      };

      navigator.mozInputMethod.mgmt.dispatchEvent(evt);

      getResult = { error: 'Mocked Error' };
      setResult = { result: undefined };

      registry.taskQueue.then(function() {
        assert.isFalse(lockSetStub.calledOnce);

        assert.isTrue(evt.detail.waitUntil.calledOnce);
        return evt.detail.waitUntil.firstCall.args[0];
      }).then(function(p) {
        assert.ok(false, 'Should not resolve.');
      }, function(e) {
        if (typeof e === 'object') { throw e; }
        assert.equal(e, 'Error updating input.');
      }).then(done, done);
    });

    test('fail to set settings', function(done) {
      var evt = {
        type: 'addinputrequest',
        detail: {
          id: 1,
          manifestURL: domApp.manifestURL,
          inputId: 'foo',
          inputManifest: {
            types: ['url', 'text'],
            launch_path: '/index.html#foo'
          },
          waitUntil: this.sinon.stub()
        },
        preventDefault: this.sinon.stub()
      };

      navigator.mozInputMethod.mgmt.dispatchEvent(evt);

      var obj = {};
      obj[registry.SETTING_KEY] = {};
      getResult = { result: obj };
      setResult = { error: 'Mocked Error' };

      registry.taskQueue.then(function() {
        assert.isTrue(evt.detail.waitUntil.calledOnce);
        return evt.detail.waitUntil.firstCall.args[0];
      }).then(function(p) {
        assert.ok(false, 'Should not resolve.');
      }, function(e) {
        if (typeof e === 'object') { throw e; }
        assert.equal(e, 'Error updating input.');
      }).then(done, done);
    });

    test('add an input for uninstalled app', function(done) {
      var evt = {
        type: 'addinputrequest',
        detail: {
          id: 1,
          manifestURL: 'app://myfunnykeyboard.org/manifest.webapp',
          inputId: 'foo',
          inputManifest: {
            types: ['url', 'text'],
            launch_path: '/index.html#foo'
          },
          waitUntil: this.sinon.stub()
        },
        preventDefault: this.sinon.stub()
      };

      navigator.mozInputMethod.mgmt.dispatchEvent(evt);

      var obj = {};
      obj[registry.SETTING_KEY] = {};
      getResult = { result: obj };
      setResult = { result: undefined };

      registry.taskQueue.then(function() {
        assert.isFalse(lockSetStub.calledOnce);
        assert.isTrue(evt.detail.waitUntil.calledOnce);
        return evt.detail.waitUntil.firstCall.args[0];
      }).then(function(p) {
        assert.ok(false, 'Should not resolve.');
      }, function(e) {
        if (typeof e === 'object') { throw e; }
        assert.equal(e, 'App not installed');
      }).then(done, done);
    });

    test('add an input for static layout', function(done) {
      var evt = {
        type: 'addinputrequest',
        detail: {
          id: 1,
          manifestURL: domApp.manifestURL,
          inputId: 'en',
          inputManifest: {
            types: ['url', 'text'],
            launch_path: '/index.html#en'
          },
          waitUntil: this.sinon.stub()
        },
        preventDefault: this.sinon.stub()
      };

      navigator.mozInputMethod.mgmt.dispatchEvent(evt);

      var obj = {};
      obj[registry.SETTING_KEY] = {};
      getResult = { result: obj };
      setResult = { result: undefined };

      registry.taskQueue.then(function() {
        assert.isFalse(lockSetStub.calledOnce);
        assert.isTrue(evt.detail.waitUntil.calledOnce);
        return evt.detail.waitUntil.firstCall.args[0];
      }).then(function(p) {
        assert.ok(false, 'Should not resolve.');
      }, function(e) {
        if (typeof e === 'object') { throw e; }
        assert.equal(e, 'Can\'t mutate a statically declared input.');
      }).then(done, done);
    });
  });

  suite('inputregistry-remove', function() {
    test('remove an input', function(done) {
      var evt = {
        type: 'removeinputrequest',
        detail: {
          id: 1,
          manifestURL: domApp.manifestURL,
          inputId: 'foo',
          waitUntil: this.sinon.stub()
        },
        preventDefault: this.sinon.stub()
      };

      navigator.mozInputMethod.mgmt.dispatchEvent(evt);

      var obj = {};
      obj[registry.SETTING_KEY] = {
        'app://keyboard.gaiamobile.org/manifest.webapp': {
          foo: {
            types: ['url', 'text'],
            launch_path: '/index.html#foo'
          }
        }
      };
      getResult = { result: obj };
      setResult = { result: undefined };

      registry.taskQueue.then(function() {
        assert.isTrue(lockSetStub.calledWith({
          'keyboard.dynamic-inputs': {}
        }));

        assert.isTrue(evt.detail.waitUntil.calledOnce);
        return evt.detail.waitUntil.firstCall.args[0];
      }).then(function(p) {
        assert.ok(true, 'resolved');
      }, function(e) {
        throw e || 'Should not reject.';
      }).then(done, done);
    });

    test('remove an non-exist input', function(done) {
      var evt = {
        type: 'removeinputrequest',
        detail: {
          id: 1,
          manifestURL: domApp.manifestURL,
          inputId: 'foo2',
          waitUntil: this.sinon.stub()
        },
        preventDefault: this.sinon.stub()
      };

      navigator.mozInputMethod.mgmt.dispatchEvent(evt);

      var obj = {};
      obj[registry.SETTING_KEY] = {
        'app://keyboard.gaiamobile.org/manifest.webapp': {}
      };
      getResult = { result: obj };
      setResult = { result: undefined };

      registry.taskQueue.then(function() {
        assert.isTrue(lockSetStub.calledWith({
          'keyboard.dynamic-inputs': {}
        }));

        assert.isTrue(evt.detail.waitUntil.calledOnce);
        return evt.detail.waitUntil.firstCall.args[0];
      }).then(function(p) {
        assert.ok(true, 'resolved');
      }, function(e) {
        throw e || 'Should not reject.';
      }).then(done, done);
    });

    test('fail to get settings', function(done) {
      var evt = {
        type: 'removeinputrequest',
        detail: {
          id: 1,
          manifestURL: domApp.manifestURL,
          inputId: 'foo',
          waitUntil: this.sinon.stub()
        },
        preventDefault: this.sinon.stub()
      };

      navigator.mozInputMethod.mgmt.dispatchEvent(evt);

      getResult = { error: 'Mocked Error' };
      setResult = { result: undefined };

      registry.taskQueue.then(function() {
        assert.isFalse(lockSetStub.calledOnce);

        assert.isTrue(evt.detail.waitUntil.calledOnce);
        return evt.detail.waitUntil.firstCall.args[0];
      }).then(function(p) {
        assert.ok(false, 'Should not resolve.');
      }, function(e) {
        if (typeof e === 'object') { throw e; }
        assert.equal(e, 'Error updating input.');
      }).then(done, done);
    });

    test('fail to set settings', function(done) {
      var evt = {
        type: 'removeinputrequest',
        detail: {
          id: 1,
          manifestURL: domApp.manifestURL,
          inputId: 'foo',
          waitUntil: this.sinon.stub()
        },
        preventDefault: this.sinon.stub()
      };

      navigator.mozInputMethod.mgmt.dispatchEvent(evt);

      var obj = {};
      obj[registry.SETTING_KEY] = {};
      getResult = { result: obj };
      setResult = { error: 'Mocked Error' };

      registry.taskQueue.then(function() {
        assert.isTrue(evt.detail.waitUntil.calledOnce);
        return evt.detail.waitUntil.firstCall.args[0];
      }).then(function(p) {
        assert.ok(false, 'Should not resolve.');
      }, function(e) {
        if (typeof e === 'object') { throw e; }
        assert.equal(e, 'Error updating input.');
      }).then(done, done);
    });

    test('remove an input for uninstalled app', function(done) {
      var evt = {
        type: 'removeinputrequest',
        detail: {
          id: 1,
          manifestURL: 'app://myfunnykeyboard.org/manifest.webapp',
          inputId: 'foo',
          waitUntil: this.sinon.stub()
        },
        preventDefault: this.sinon.stub()
      };

      navigator.mozInputMethod.mgmt.dispatchEvent(evt);

      var obj = {};
      obj[registry.SETTING_KEY] = {};
      getResult = { result: obj };
      setResult = { result: undefined };

      registry.taskQueue.then(function() {
        assert.isFalse(lockSetStub.calledOnce);
        assert.isTrue(evt.detail.waitUntil.calledOnce);
        return evt.detail.waitUntil.firstCall.args[0];
      }).then(function(p) {
        assert.ok(false, 'Should not resolve.');
      }, function(e) {
        if (typeof e === 'object') { throw e; }
        assert.equal(e, 'App not installed');
      }).then(done, done);
    });

    test('remove an input for static layout', function(done) {
      var evt = {
        type: 'removeinputrequest',
        detail: {
          id: 1,
          manifestURL: domApp.manifestURL,
          inputId: 'en',
          waitUntil: this.sinon.stub()
        },
        preventDefault: this.sinon.stub()
      };

      navigator.mozInputMethod.mgmt.dispatchEvent(evt);

      var obj = {};
      obj[registry.SETTING_KEY] = {};
      getResult = { result: obj };
      setResult = { result: undefined };

      registry.taskQueue.then(function() {
        assert.isFalse(lockSetStub.calledOnce);
        assert.isTrue(evt.detail.waitUntil.calledOnce);
        return evt.detail.waitUntil.firstCall.args[0];
      }).then(function(p) {
        assert.ok(false, 'Should not resolve.');
      }, function(e) {
        if (typeof e === 'object') { throw e; }
        assert.equal(e, 'Can\'t mutate a statically declared input.');
      }).then(done, done);
    });
  });
});
