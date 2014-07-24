'use strict';

suite('KeyboardCore', function() {
  var map = {
    'panels/keyboard/installed_keyboards': {
      'modules/mvvm/list_view': 'unit/mock_list_view'
    }
  };

  suiteSetup(function(done) {
    // setup mocks
    this.mockKeyboardTemplate = function() {};
    this.mockKeyboards = [];
    this.mockElements = { listViewRoot: {} };

    testRequire([
      'unit/mock_keyboard_context',
      'unit/mock_list_view',
      'panels/keyboard/installed_keyboards'
    ], map, function(MockKeyboardContext, MockListView, KeyboardCore) {
      this.MockKeyboardContext = MockKeyboardContext;
      this.MockListView = MockListView;
      this.KeyboardCore = KeyboardCore;
      done();
    }.bind(this));
  });

  setup(function() {
    this.subject =
      this.KeyboardCore(this.MockKeyboardContext, this.mockKeyboardTemplate);
  });

  teardown(function() {
    this.MockKeyboardContext.mTeardown();
  });

  test('init', function() {
    this.MockKeyboardContext.mKeyboards = this.mockKeyboards;
    sinon.spy(this.subject, '_initAllKeyboardListView');

    this.subject.init(this.mockElements);

    assert.ok(this.subject._initAllKeyboardListView.calledWith(
      this.mockElements.listViewRoot, this.mockKeyboards,
      this.mockKeyboardTemplate),
      '_initAllKeyboardListView should be called with correct parameters');
  });

  test('when enabled = true', function() {
    this.subject._listView = { enabled: false };
    this.subject.enabled = true;
    assert.ok(this.subject._listView.enabled,
      'the list view should be enabled');
  });

  test('when enabled = false' , function() {
    this.subject._listView = { enabled: true };
    this.subject.enabled = false;
    assert.ok(!this.subject._listView.enabled,
      'the list view should be disabled');
  });

  suite('_initAllKeyboardListView', function() {
    setup(function() {
      this.mockKeyboards = [];
      this.ListViewStub = sinon.stub().returns({});
      this.MockListView.mInnerFunction = this.ListViewStub;
    });

    teardown(function() {
      this.MockListView.mTeardown();
    });

    test('when called', function() {
      this.subject._initAllKeyboardListView(this.mockElements.listViewRoot,
        this.mockKeyboards, this.mockKeyboardTemplate);

      assert.ok(this.ListViewStub.calledWith(this.mockElements.listViewRoot,
        this.mockKeyboards, this.mockKeyboardTemplate),
        'the list view should be created with correct arguments');
      assert.ok(this.subject._listView, 'the list view should be created');
    });

    test('when there are no installed keyboards', function() {
      this.subject._initAllKeyboardListView(this.mockElements.listViewRoot,
        this.mockKeyboards, this.mockKeyboardTemplate);
      assert.ok(this.mockElements.listViewRoot.hidden, 'should hide the list');
    });

    test('when there are installed keyboards', function() {
      this.mockKeyboards.push({});
      this.subject._initAllKeyboardListView(this.mockElements.listViewRoot,
        this.mockKeyboards, this.mockKeyboardTemplate);
      assert.ok(!this.mockElements.listViewRoot.hidden, 'should show the list');
    });
  });
});
