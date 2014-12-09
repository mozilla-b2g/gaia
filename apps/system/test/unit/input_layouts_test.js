'use strict';

/* global MocksHelper, InputLayouts, MockKeyboardManager, MockCustomEvent,
   MockKeyboardHelper, MockNavigatorMozSettings, MockNavigatorMozSettingsLock,
   MockDOMRequest */

require('/test/unit/mock_keyboard_manager.js');
require('/test/unit/mock_custom_event.js');
require('/shared/test/unit/mocks/mock_keyboard_helper.js');
require('/shared/test/unit/mocks/mock_custom_event.js');
require('/shared/test/unit/mocks/mock_event_target.js');
require('/shared/test/unit/mocks/mock_dom_request.js');
require('/shared/js/input_mgmt/mock_navigator_mozsettings.js');

require('/js/input_layouts.js');

var mocksForInputLayouts = new MocksHelper([
  'KeyboardHelper',
  'KeyboardManager',
  'CustomEvent'
]).init();

suite('InputLayouts', function() {
  var inputLayouts;
  var realMozSettings;

  var appLayouts = [{
    layoutId: 'en',
    app: {
      origin: 'app://k.gaiamobile.org',
      manifestURL: 'app://k.gaiamobile.org/manifest.webapp'
    },
    inputManifest: {
      launch_path: '/settings.html',
      name: 'en',
      types: ['text', 'number']
    },
    manifest: {
      name: 'eng'
    }
  }];

  mocksForInputLayouts.attachTestHelpers();

  suiteSetup(function() {
    realMozSettings = navigator.mozSettings;
  });

  suiteTeardown(function() {
    navigator.mozSettings = realMozSettings;
  });

  setup(function() {
    navigator.mozSettings = new MockNavigatorMozSettings();

    inputLayouts = new InputLayouts(MockKeyboardManager, {
      'text': 'textG',
      'password': 'password',
      'text2': 'textG'
    });
  });

  test('start() calls _getSettings', function() {
    var stubGetSettings = this.sinon.stub(inputLayouts, '_getSettings');
    inputLayouts.start();
    assert.isTrue(stubGetSettings.called);
  });

  test('groupToTypeTable generation', function() {
    assert.deepEqual(inputLayouts._groupToTypeTable, {
      'textG': ['text', 'text2'],
      'password': ['password']
    });
  });

  test('transformLayout', function() {
    var transformed = inputLayouts._transformLayout(appLayouts[0]);
    // don't do deepEqual 'cause getters will not match
    assert.equal(transformed.id, 'en');
    assert.equal(transformed.origin, 'app://k.gaiamobile.org');
    assert.equal(transformed.manifestURL,
      'app://k.gaiamobile.org/manifest.webapp');
    assert.equal(transformed.path, '/settings.html');
    assert.equal(transformed.name, 'en');
    assert.equal(transformed.appName, 'eng');
  });

  test('insertLayouts', function() {
    this.sinon.stub(MockKeyboardHelper, 'isKeyboardType').returns(true);
    var stubTransformLayout =
      this.sinon.stub(inputLayouts, '_transformLayout').returns('LAYOUT');

    inputLayouts._enabledApps = new Set();

    inputLayouts._insertLayouts(appLayouts);

    assert.isTrue(
      inputLayouts._enabledApps.has('app://k.gaiamobile.org/manifest.webapp')
    );
    assert.isTrue('text' in inputLayouts.layouts);
    assert.isTrue('number' in inputLayouts.layouts);
    assert.isTrue(stubTransformLayout.calledWith(appLayouts[0]));
    assert.deepEqual(inputLayouts.layouts.text, ['LAYOUT']);
    assert.deepEqual(inputLayouts.layouts.number, ['LAYOUT']);
  });

  test('insertFallbackLayouts', function() {
    var oldFallbackLayouts = MockKeyboardHelper.fallbackLayouts;

    MockKeyboardHelper.fallbackLayouts = {
      password: {
        app: {
          origin: 'app://keyboard.gaiamobile.org',
          manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp'
        },
        layoutId: 'pwLayout',
        inputManifest: {
          launch_path: '/settings.html',
          name: 'pwInput'
        },
        manifest: {
          name: 'pwInput'
        }
      }
    };

    var stubTransformLayout =
      this.sinon.stub(inputLayouts, '_transformLayout').returns('LAYOUT');

    inputLayouts._enabledApps = new Set();

    inputLayouts._insertFallbackLayouts();

    assert.isTrue(
      inputLayouts._enabledApps.has(
        'app://keyboard.gaiamobile.org/manifest.webapp'
      )
    );

    assert.isTrue(
      stubTransformLayout.calledWith(
        MockKeyboardHelper.fallbackLayouts.password
      )
    );

    assert.deepEqual(inputLayouts.layouts.password, ['LAYOUT']);

    MockKeyboardHelper.fallbackLayouts = oldFallbackLayouts;
  });

  test('emitLayoutCount', function() {
    inputLayouts.layouts = {
      'text': ['en', 'fr', 'zh-hans'],
      'password': ['en', 'fr']
    };

    var oldGroupToTypeTable = inputLayouts._groupToTypeTable;
    inputLayouts._groupToTypeTable = {
      'text': ['text', 'textarea'],
      'password': ['password']
    };

    var evt = new MockCustomEvent();

    var stubCreateEvent = this.sinon.stub(document, 'createEvent');
    var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');
    var stubInitCustomEvent = this.sinon.stub(evt, 'initCustomEvent');

    stubCreateEvent.returns(evt);

    inputLayouts._emitLayoutsCount();

    assert.isTrue(stubCreateEvent.calledWith('CustomEvent'));

    assert.isTrue(stubInitCustomEvent.calledWith('mozContentEvent', true, true,
      {
        type: 'inputmethod-update-layouts',
        layouts: {
          'text': 3,
          'textarea': 3,
          'password': 2
      }
    }));

    assert.isTrue(stubDispatchEvent.calledWith(evt));

    inputLayouts._groupToTypeTable = oldGroupToTypeTable;
  });

  test('generateToGroupMapping', function() {
    inputLayouts.layouts = {
      'text': [
        {
          manifestURL: 'app://k.gaiamobile.org/manifest.webapp',
          id: 'en'
        }, {
          manifestURL: 'app://k.gaiamobile.org/manifest.webapp',
          id: 'fr'
        }, {
          manifestURL: 'app://k.gaiamobile.org/manifest.webapp',
          id: 'es'
        }
      ],
      'number': [
        {
          manifestURL: 'app://k.gaiamobile.org/manifest.webapp',
          id: 'en'
        }, {
          manifestURL: 'app://k.gaiamobile.org/manifest.webapp',
          id: 'es'
        }, {
          manifestURL: 'app://k.gaiamobile.org/manifest.webapp',
          id: 'pt'
        }, {
          manifestURL: 'app://k2.gaiamobile.org/manifest.webapp',
          id: 'romanNumerial'
        }
      ]
    };
    inputLayouts._generateToGroupMapping();

    assert.deepEqual(inputLayouts._layoutToGroupMapping, {
      'app://k.gaiamobile.org/manifest.webapp/en':
        [
          {group: 'text', index: 0},
          {group: 'number', index: 0}
        ],
      'app://k.gaiamobile.org/manifest.webapp/fr':
        [
          {group: 'text', index: 1}
        ],
      'app://k.gaiamobile.org/manifest.webapp/es':
        [
          {group: 'text', index: 2},
          {group: 'number', index: 1}
        ],
      'app://k.gaiamobile.org/manifest.webapp/pt':
        [
          {group: 'number', index: 2}
        ],
      'app://k2.gaiamobile.org/manifest.webapp/romanNumerial':
        [
          {group: 'number', index: 3}
        ]
    });
  });

  // we're not testing layouts[group].activeLayout here as it's being tested (in
  // an integrated sense) in KeyboardManager's "Try using the same layout when
  // switching input types" test
  test('saveGroupsCurrentActiveLayout', function() {
    inputLayouts._layoutToGroupMapping = {
      'app://k.gaiamobile.org/manifest.webapp/en': [
        {group: 'text', index: 12},
        {group: 'number', index: 34}
      ]
    };

    inputLayouts.layouts = {
      'text': [],
      'number': []
    };

    inputLayouts._currentActiveLayouts = {};

    inputLayouts.layouts.text[12] = 'en';
    inputLayouts.layouts.number[34] = 'en';

    var stubMockNavigatorMozSettingsLock =
      this.sinon.stub(MockNavigatorMozSettingsLock.prototype);

    stubMockNavigatorMozSettingsLock.set.returns(new MockDOMRequest());

    inputLayouts.saveGroupsCurrentActiveLayout({
      manifestURL: 'app://k.gaiamobile.org/manifest.webapp',
      id: 'en'
    });

    assert.equal(inputLayouts.layouts.text.activeLayout, 12,
                 '"text" activeLayout was not changed');
    assert.equal(inputLayouts.layouts.number.activeLayout, 34,
                 '"number" activeLayout was not changed');

    assert.isTrue(stubMockNavigatorMozSettingsLock.set.calledWith(
      {
        'keyboard.current-active-layouts': {
          text: {
            manifestURL: 'app://k.gaiamobile.org/manifest.webapp',
            id: 'en'
          },
          number: {
            manifestURL: 'app://k.gaiamobile.org/manifest.webapp',
            id: 'en'
          }
        }
      }
    ));
  });

  test('processLayouts', function() {
    var stubInsertLayouts = this.sinon.stub(inputLayouts, '_insertLayouts',
      function() {
        inputLayouts.layouts = {
          text: ['en'],
          password: ['en']
        };

        inputLayouts._enabledApps.add('app://k.gaiamobile.org/manifest.webapp');
      });

    var stubInsertFallbacklayouts =
      this.sinon.stub(inputLayouts, '_insertFallbackLayouts');

    var stubEmitLayoutsCount =
      this.sinon.stub(inputLayouts, '_emitLayoutsCount');

    var enabledApps = inputLayouts.processLayouts(appLayouts);

    assert.isTrue(stubInsertLayouts.calledWith(appLayouts));
    assert.isTrue(stubInsertFallbacklayouts.called);

    assert.isTrue(
      Object.keys(inputLayouts.layouts).every(
        group => inputLayouts.layouts[group].activeLayout === undefined
      )
    );

    assert.isTrue(stubEmitLayoutsCount.called);

    assert.isTrue(enabledApps.has('app://k.gaiamobile.org/manifest.webapp'));
    assert.equal(enabledApps.size, 1);
  });

  suite('getGroupCurrentActiveLayoutIndexAsync', function() {
    test('success route null', function(done) {
      // we test three things in this test:
      // 1. when _promise = null, if everything is good;
      // 2. when _promise already has something (subsequent to 1),
      //    2a. and resolves to some known layout
      //    2b. and resolves to some unknown layout
      // 2a and 2b are what KeyboardManager test used to test.
      inputLayouts.layouts = {
        text: [
          {
            id: 'fr',
            manifestURL: 'app://k.gaiamobile.org/manifest.webapp'
          },
          {
            id: 'en',
            manifestURL: 'app://k.gaiamobile.org/manifest.webapp'
          }
        ]
      };

      var stubMockNavigatorMozSettingsLock =
        this.sinon.stub(MockNavigatorMozSettingsLock.prototype);

      var step1 = function(){
        inputLayouts._promise = null;

        var req = new MockDOMRequest();

        stubMockNavigatorMozSettingsLock.get.returns(req);

        var p = inputLayouts.getGroupCurrentActiveLayoutIndexAsync('text');

        assert.equal(stubMockNavigatorMozSettingsLock.get.callCount, 1);
        assert.isTrue(
          stubMockNavigatorMozSettingsLock.get
            .calledWith('keyboard.current-active-layouts')
        );

        req.fireSuccess({
          'keyboard.current-active-layouts': {
            text: {
              id: 'en',
              manifestURL: 'app://k.gaiamobile.org/manifest.webapp'
            }
          }
        });

        p.then(step2);
      };

      var step2 = function(){
        assert.notStrictEqual(inputLayouts._promise, null);

        var p = inputLayouts.getGroupCurrentActiveLayoutIndexAsync('text');

        // get should not be called again
        assert.equal(stubMockNavigatorMozSettingsLock.get.callCount, 1);

        p.then(currentActiveLayoutsIdx => {
          assert.equal(currentActiveLayoutsIdx, 1);

          step3();
        });
      };

      var step3 = function(){
        assert.notStrictEqual(inputLayouts._promise, null);

        var p = inputLayouts.getGroupCurrentActiveLayoutIndexAsync('number');

        // get should not be called again
        assert.equal(stubMockNavigatorMozSettingsLock.get.callCount, 1);

        p.then(currentActiveLayoutsIdx => {
          assert.strictEqual(currentActiveLayoutsIdx, undefined);

          done();
        });
      };

      step1();
    });

    test('_getSettings throws and resets _promise on error', function(done) {
      var stubMockNavigatorMozSettingsLock =
        this.sinon.stub(MockNavigatorMozSettingsLock.prototype);

      inputLayouts._promise = null;

      var req = new MockDOMRequest();

      stubMockNavigatorMozSettingsLock.get.returns(req);

      var p = inputLayouts.getGroupCurrentActiveLayoutIndexAsync('text');

      assert.notStrictEqual(inputLayouts._promise, null);

      // we want to catch that throw to not disrupt test flow
      p.catch(e => {
        assert.equal(e, 'error!');
        assert.strictEqual(inputLayouts._promise, null);

        done();
      });

      req.fireError('error!');
    });
  });
});
