'use strict';

/* global DynamicInputRegistry, InputAppList, InputApp,
          MockNavigatorMozSettings, MockNavigatorMozSettingsLock,
          MockDOMRequest */

require('/shared/test/unit/mocks/mock_event_target.js');
require('/shared/test/unit/mocks/mock_dom_request.js');
require('/shared/js/input_mgmt/mock_navigator_mozsettings.js');

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
  var lockGetStub;
  var lockSetStub;

  var registry;
  var realDispatchEvent;

  var domApp;
  var inputApp;

  var getResult;
  var setResult;

  var dispatchChromeEvent = function dispatchChromeEvent(detail) {
    realDispatchEvent.call(window, new CustomEvent('mozChromeEvent', {
      detail: detail
    }));
  };

  suiteSetup(function() {
    realMozSettings = navigator.mozSettings;
  });

  suiteTeardown(function() {
    navigator.mozSettings = realMozSettings;
  });

  setup(function(done) {
    var mozSettings = navigator.mozSettings = new MockNavigatorMozSettings();
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
    realDispatchEvent = window.dispatchEvent;
    this.sinon.spy(window, 'dispatchEvent');

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

    assert.isTrue(
      window.addEventListener.calledWith('mozChromeEvent', registry));

    registry.taskQueue.then(done, done);
  });

  teardown(function() {
    registry.stop();

    assert.isTrue(
      window.removeEventListener.calledWith('mozChromeEvent', registry));
  });

  suite('inputregistry-add', function() {
    test('add an input', function(done) {
      dispatchChromeEvent({
        type: 'inputregistry-add',
        id: 1,
        manifestURL: domApp.manifestURL,
        inputId: 'foo',
        inputManifest: {
          types: ['url', 'text'],
          launch_path: '/index.html#foo'
        }
      });

      var obj = {};
      obj[registry.SETTING_KEY] = {};
      getResult = { result: obj };
      setResult = { result: undefined };

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

        var evt = window.dispatchEvent.getCall(0).args[0];
        assert.equal(evt.type, 'mozContentEvent');
        assert.deepEqual(evt.detail, { type: 'inputregistry-add', id: 1 });
      }).then(done, done);
    });

    test('fail to get settings', function(done) {
      dispatchChromeEvent({
        type: 'inputregistry-add',
        id: 1,
        manifestURL: domApp.manifestURL,
        inputId: 'foo',
        inputManifest: {
          types: ['url', 'text'],
          launch_path: '/index.html#foo'
        }
      });

      getResult = { error: 'Mocked Error' };
      setResult = { result: undefined };

      registry.taskQueue.then(function() {
        assert.isFalse(lockSetStub.calledOnce);

        var evt = window.dispatchEvent.getCall(0).args[0];
        assert.equal(evt.type, 'mozContentEvent');
        assert.deepEqual(evt.detail,
          { type: 'inputregistry-add', id: 1, error: 'Error updating input.' });
      }).then(done, done);
    });

    test('fail to set settings', function(done) {
      dispatchChromeEvent({
        type: 'inputregistry-add',
        id: 1,
        manifestURL: domApp.manifestURL,
        inputId: 'foo',
        inputManifest: {
          types: ['url', 'text'],
          launch_path: '/index.html#foo'
        }
      });

      var obj = {};
      obj[registry.SETTING_KEY] = {};
      getResult = { result: obj };
      setResult = { error: 'Mocked Error' };

      registry.taskQueue.then(function() {
        var evt = window.dispatchEvent.getCall(0).args[0];
        assert.equal(evt.type, 'mozContentEvent');
        assert.deepEqual(evt.detail,
          { type: 'inputregistry-add', id: 1, error: 'Error updating input.' });
      }).then(done, done);
    });

    test('add an input for uninstalled app', function(done) {
      dispatchChromeEvent({
        type: 'inputregistry-add',
        id: 1,
        manifestURL: 'app://myfunnykeyboard.org/manifest.webapp',
        inputId: 'foo',
        inputManifest: {
          types: ['url', 'text'],
          launch_path: '/index.html#foo'
        }
      });

      var obj = {};
      obj[registry.SETTING_KEY] = {};
      getResult = { result: obj };
      setResult = { result: undefined };

      registry.taskQueue.then(function() {
        assert.isFalse(lockSetStub.calledOnce);

        var evt = window.dispatchEvent.getCall(0).args[0];
        assert.equal(evt.type, 'mozContentEvent');
        assert.deepEqual(evt.detail,
          { type: 'inputregistry-add', id: 1, error: 'App not installed' });
      }).then(done, done);
    });

    test('add an input for static layout', function(done) {
      dispatchChromeEvent({
        type: 'inputregistry-add',
        id: 1,
        manifestURL: domApp.manifestURL,
        inputId: 'en',
        inputManifest: {
          types: ['url', 'text'],
          launch_path: '/index.html#en'
        }
      });

      var obj = {};
      obj[registry.SETTING_KEY] = {};
      getResult = { result: obj };
      setResult = { result: undefined };

      registry.taskQueue.then(function() {
        assert.isFalse(lockSetStub.calledOnce);

        var evt = window.dispatchEvent.getCall(0).args[0];
        assert.equal(evt.type, 'mozContentEvent');
        assert.deepEqual(evt.detail,
          { type: 'inputregistry-add', id: 1,
            error: 'Can\'t mutate a statically declared input.' });
      }).then(done, done);
    });
  });

  suite('inputregistry-remove', function() {
    test('remove an input', function(done) {
      dispatchChromeEvent({
        type: 'inputregistry-remove',
        id: 1,
        manifestURL: domApp.manifestURL,
        inputId: 'foo'
      });

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

        var evt = window.dispatchEvent.getCall(0).args[0];
        assert.equal(evt.type, 'mozContentEvent');
        assert.deepEqual(evt.detail, { type: 'inputregistry-remove', id: 1 });
      }).then(done, done);
    });

    test('remove an non-exist input', function(done) {
      dispatchChromeEvent({
        type: 'inputregistry-remove',
        id: 1,
        manifestURL: domApp.manifestURL,
        inputId: 'foo'
      });

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

        var evt = window.dispatchEvent.getCall(0).args[0];
        assert.equal(evt.type, 'mozContentEvent');
        assert.deepEqual(evt.detail, { type: 'inputregistry-remove', id: 1 });
      }).then(done, done);
    });

    test('fail to get settings', function(done) {
      dispatchChromeEvent({
        type: 'inputregistry-remove',
        id: 1,
        manifestURL: domApp.manifestURL,
        inputId: 'foo'
      });

      getResult = { error: 'Mocked Error' };
      setResult = { result: undefined };

      registry.taskQueue.then(function() {
        assert.isFalse(lockSetStub.calledOnce);

        var evt = window.dispatchEvent.getCall(0).args[0];
        assert.equal(evt.type, 'mozContentEvent');
        assert.deepEqual(evt.detail,
          { type: 'inputregistry-remove', id: 1,
            error: 'Error updating input.' });
      }).then(done, done);
    });

    test('fail to set settings', function(done) {
      dispatchChromeEvent({
        type: 'inputregistry-remove',
        id: 1,
        manifestURL: domApp.manifestURL,
        inputId: 'foo'
      });

      var obj = {};
      obj[registry.SETTING_KEY] = {};
      getResult = { result: obj };
      setResult = { error: 'Mocked Error' };

      registry.taskQueue.then(function() {
        var evt = window.dispatchEvent.getCall(0).args[0];
        assert.equal(evt.type, 'mozContentEvent');
        assert.deepEqual(evt.detail,
          { type: 'inputregistry-remove', id: 1,
            error: 'Error updating input.' });
      }).then(done, done);
    });

    test('remove an input for uninstalled app', function(done) {
      dispatchChromeEvent({
        type: 'inputregistry-remove',
        id: 1,
        manifestURL: 'app://myfunnykeyboard.org/manifest.webapp',
        inputId: 'foo'
      });

      var obj = {};
      obj[registry.SETTING_KEY] = {};
      getResult = { result: obj };
      setResult = { result: undefined };

      registry.taskQueue.then(function() {
        assert.isFalse(lockSetStub.calledOnce);

        var evt = window.dispatchEvent.getCall(0).args[0];
        assert.equal(evt.type, 'mozContentEvent');
        assert.deepEqual(evt.detail,
          { type: 'inputregistry-remove', id: 1, error: 'App not installed' });
      }).then(done, done);
    });

    test('remove an input for static layout', function(done) {
      dispatchChromeEvent({
        type: 'inputregistry-remove',
        id: 1,
        manifestURL: domApp.manifestURL,
        inputId: 'en'
      });

      var obj = {};
      obj[registry.SETTING_KEY] = {};
      getResult = { result: obj };
      setResult = { result: undefined };

      registry.taskQueue.then(function() {
        assert.isFalse(lockSetStub.calledOnce);

        var evt = window.dispatchEvent.getCall(0).args[0];
        assert.equal(evt.type, 'mozContentEvent');
        assert.deepEqual(evt.detail,
          { type: 'inputregistry-remove', id: 1,
            error: 'Can\'t mutate a statically declared input.' });
      }).then(done, done);
    });
  });
});
