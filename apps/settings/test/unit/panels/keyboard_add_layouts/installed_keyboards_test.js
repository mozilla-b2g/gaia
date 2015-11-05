'use strict';

suite('KeyboardAddLayoutsCore', function() {
  var map = {
    'panels/keyboard_add_layouts/core': {
      'modules/settings_service': 'unit/mock_settings_service',
      'modules/mvvm/list_view': 'unit/mock_list_view'
    }
  };

  suiteSetup(function(done) {
    // setup mocks
    this.mockKeybordTemplate = function() {};
    this.mockKeybordTemplate.listViews =
      [{ enabled: false }, { enabled: false }];
    this.mockKeyboards = [];
    this.mockElements = { listViewRoot: {} };

    testRequire([
      'unit/mock_keyboard_context',
      'unit/mock_list_view',
      'panels/keyboard_add_layouts/core'
    ], map, function(MockKeyboardContext, MockListView,
      KeyboardAddLayoutsCore) {
        this.MockKeyboardContext = MockKeyboardContext;
        this.MockListView = MockListView;
        this.KeyboardAddLayoutsCore = KeyboardAddLayoutsCore;
        done();
    }.bind(this));
  });

  setup(function() {
    this.MockKeyboardContext.mKeyboards = this.mockKeyboards;
    this.subject = this.KeyboardAddLayoutsCore(this.MockKeyboardContext,
      this.mockKeybordTemplate);
  });

  teardown(function() {
    this.MockKeyboardContext.mTeardown();
  });

  test('init', function() {
    this.subject._showEnabledDefaultDialog = function() {};
    sinon.spy(this.MockKeyboardContext, 'defaultKeyboardEnabled');
    sinon.spy(this.subject, '_initInstalledLayoutListView');

    this.subject.init(this.mockElements, this.mockKeybordTemplate);

    assert.ok(this.subject._initInstalledLayoutListView.calledWith(
      this.mockElements.listViewRoot, this.mockKeyboards,
      this.mockKeybordTemplate),
      '_initAllKeyboardListView should be called with correct parameters');
    assert.ok(this.MockKeyboardContext.defaultKeyboardEnabled.calledWith(
      this.subject._showEnabledDefaultDialog),
      '_showEnabledDefaultDialog should be set to the keyboard context ' +
      'correctly');

    this.MockKeyboardContext.defaultKeyboardEnabled.restore();
  });

  test('when enabled = true', function() {
    this.subject._keyboardTemplate = this.mockKeybordTemplate;
    this.subject._listView = { enabled: false };
    this.subject.enabled = true;

    assert.ok(this.subject._listView.enabled,
      'the list view should be enabled');
    assert.ok(this.subject._keyboardTemplate
      .listViews.every(function(listView) { return listView.enabled; }),
      'all inner list views should be enabled');
  });

  test('when enabled = false', function() {
    this.subject._keyboardTemplate = this.mockKeybordTemplate;
    this.subject._listView = { enabled: true };
    this.subject.enabled = false;

    assert.ok(!this.subject._listView.enabled,
      'the list view should be disabled');
    assert.ok(!this.subject._keyboardTemplate
      .listViews.every(function(listView) { return listView.enabled; }),
      'all inner list views should be disabled');
  });

  test('_initInstalledLayoutListView', function() {
    this.ListViewStub = sinon.stub().returns({});
    this.MockListView.mInnerFunction = this.ListViewStub;
    var listViewRoot = {};
    var keyboards = [{}];
    var keyboardTemplate = function() {};

    this.subject._initInstalledLayoutListView(listViewRoot, keyboards,
      keyboardTemplate);

    assert.ok(this.ListViewStub
      .calledWith(listViewRoot, keyboards, keyboardTemplate),
      'the list view should be created with correct arguments');
    assert.ok(this.subject._listView, 'the list view should be created');

    this.MockListView.mTeardown();
  });
});
