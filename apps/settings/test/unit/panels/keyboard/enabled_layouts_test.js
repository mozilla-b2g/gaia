'use strict';

suite('KeyboardEnabledLayoutsCore', function() {
  var map = {
    'panels/keyboard/enabled_layouts': {
      'modules/settings_service': 'unit/mock_settings_service',
      'modules/mvvm/list_view': 'unit/mock_list_view'
    }
  };

  suiteSetup(function(done) {
    // setup mocks
    this.mockLayoutTemplate = function() {};
    this.mockEnabledLayouts = [];
    this.mockElements = { listViewRoot: {} };

    testRequire([
      'unit/mock_keyboard_context',
      'unit/mock_list_view',
      'panels/keyboard/enabled_layouts'
    ], map, function(MockKeyboardContext, MockListView,
      KeyboardEnabledLayoutsCore) {
        this.MockKeyboardContext = MockKeyboardContext;
        this.MockListView = MockListView;
        this.KeyboardEnabledLayoutsCore = KeyboardEnabledLayoutsCore;
        done();
    }.bind(this));
  });

  setup(function() {
    this.MockKeyboardContext.mEnabledLayouts = this.mockEnabledLayouts;
    this.subject = this.KeyboardEnabledLayoutsCore(this.MockKeyboardContext,
      this.mockLayoutTemplate);
  });

  teardown(function() {
    this.MockKeyboardContext.mTeardown();
  });

  test('init', function() {
    sinon.spy(this.subject, '_initEnabledLayoutListView');

    this.subject.init(this.mockElements);

    assert.ok(this.subject._initEnabledLayoutListView.calledWith(
      this.mockElements.listViewRoot, this.mockEnabledLayouts,
      this.mockLayoutTemplate),
      '_initEnabledLayoutListView should be called with correct parameters');
  });

  test('when enabled = true', function() {
    this.subject._listView = { enabled: false };
    this.subject.enabled = true;
    assert.ok(this.subject._listView.enabled,
      'the list view should be enabled');
  });

  test('when enabled = false', function() {
    this.subject._listView = { enabled: true };
    this.subject.enabled = false;
    assert.ok(!this.subject._listView.enabled,
      'the list view should be disabled');
  });

  test('_initEnabledLayoutListView', function() {
    this.ListViewStub = sinon.stub().returns({});
    this.MockListView.mInnerFunction = this.ListViewStub;
    var listViewRoot = {};
    var layouts = [{}];
    var layoutTemplate = function() {};

    this.subject._initEnabledLayoutListView(listViewRoot, layouts,
      layoutTemplate);

    assert.ok(this.ListViewStub
      .calledWith(listViewRoot, layouts, layoutTemplate),
      'the list view should be created with correct arguments');
    assert.ok(this.subject._listView, 'the list view should be created');

    this.MockListView.mTeardown();
  });
});
