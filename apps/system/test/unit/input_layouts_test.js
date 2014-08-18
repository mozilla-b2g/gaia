'use strict';

/* global MocksHelper, InputLayouts, MockKeyboardManager,
   MockCustomEvent, MockKeyboardHelper */

require('/test/unit/mock_keyboard_manager.js');
require('/test/unit/mock_custom_event.js');
require('/shared/test/unit/mocks/mock_keyboard_helper.js');
require('/shared/test/unit/mocks/mock_custom_event.js');
require('/js/input_layouts.js');

var mocksForInputLayouts = new MocksHelper([
  'KeyboardHelper',
  'KeyboardManager',
  'CustomEvent'
]).init();

suite('InputLayouts', function() {
  var inputLayouts;

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

  setup(function() {
    inputLayouts = new InputLayouts(MockKeyboardManager);
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

    inputLayouts._enabledApps = Set();

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

    inputLayouts._enabledApps = Set();

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

    var oldInputTypeTable = inputLayouts._keyboardManager.inputTypeTable;
    inputLayouts._keyboardManager.inputTypeTable = {
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

    inputLayouts._keyboardManager.inputTypeTable = oldInputTypeTable;
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

  test('setGroupsActiveLayout', function() {
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
    inputLayouts.layouts.text[12] = 'en';
    inputLayouts.layouts.number[34] = 'en';

    inputLayouts.setGroupsActiveLayout({
      manifestURL: 'app://k.gaiamobile.org/manifest.webapp',
      id: 'en'
    });

    assert.equal(inputLayouts.layouts.text.activeLayout, 12,
                 '"text" activeLayout was not changed');
    assert.equal(inputLayouts.layouts.number.activeLayout, 34,
                 '"number" activeLayout was not changed');
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
        group => inputLayouts.layouts[group].activeLayout === 0
      )
    );

    assert.isTrue(stubEmitLayoutsCount.called);

    assert.isTrue(enabledApps.has('app://k.gaiamobile.org/manifest.webapp'));
    assert.equal(enabledApps.size, 1);
  });
});
