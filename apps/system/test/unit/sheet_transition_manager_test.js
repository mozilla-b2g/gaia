/* global SheetTransitionManager, MockStackManager,
          MocksHelper, AppWindow */

'use strict';

requireApp('system/test/unit/mock_app_window.js');
requireApp('system/test/unit/mock_stack_manager.js');
requireApp('system/test/unit/mock_app_window_manager.js');
requireApp('system/test/unit/mock_edge_swipe_detector.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');

var mocksForSheetTransitionManager = new MocksHelper([
  'StackManager',
  'AppWindowManager',
  'SettingsListener',
  'AppWindow',
  'EdgeSwipeDetector'
]).init();

suite('system/SheetTransitionManager >', function() {
  mocksForSheetTransitionManager.attachTestHelpers();
  var stubById;
  var dialer, settings, contacts;
  var getPrevStub, getNextStub;

  setup(function(done) {
    window.stackManager = MockStackManager;
    dialer = new AppWindow({
      origin: 'app://dialer.gaiamobile.org'
    });

    settings = new AppWindow({
      origin: 'app://settings.gaiamobile.org'
    });

    contacts = new AppWindow({
      origin: 'app://contacts.gaiamobile.org'
    });
    stubById = this.sinon.stub(document, 'getElementById');
    stubById.returns(document.createElement('div'));
    getPrevStub = this.sinon.stub(MockStackManager, 'getPrev');
    getPrevStub.returns(dialer);

    this.sinon.stub(MockStackManager, 'getCurrent').returns(settings);

    getNextStub = this.sinon.stub(MockStackManager, 'getNext');
    getNextStub.returns(contacts);

    requireApp('system/js/sheet_transition_manager.js', done);
  });

  teardown(function() {
    stubById.restore();
  });

  suite('handleEvent', function() {
    test('appsheet-transitionend should clear the transition state.',
      function() {
        var stubEnd = this.sinon.stub(SheetTransitionManager, 'end');
        SheetTransitionManager
          .handleEvent(new CustomEvent('appsheet-transitionend'));
        assert.isTrue(stubEnd.called);
      });
    test('open homescreen should clear the transition state.',
      function() {
        var stubEnd = this.sinon.stub(SheetTransitionManager, 'end');
        SheetTransitionManager
          .handleEvent(new CustomEvent('homescreenopening'));
        assert.isTrue(stubEnd.called);
      });
    test('open an app should clear the transition state.',
      function() {
        var stubEnd = this.sinon.stub(SheetTransitionManager, 'end');
        SheetTransitionManager
          .handleEvent(new CustomEvent('appopened'));
        assert.isTrue(stubEnd.called);
      });
  });

  test('Enter sheet transition', function() {
    SheetTransitionManager.screen.classList.remove('sheet-transitioning');
    SheetTransitionManager.overlay.classList.remove('visible');
    SheetTransitionManager.begin('ltr');
    assert.isTrue(
      SheetTransitionManager.screen.classList.contains('sheet-transitioning'));
    assert.isTrue(
      SheetTransitionManager.overlay.classList.contains('visible'));
  });

  test('Leave sheet transition', function() {
    SheetTransitionManager.screen.classList.add('sheet-transitioning');
    SheetTransitionManager.overlay.classList.add('visible');
    SheetTransitionManager.end();
    assert.isFalse(
      SheetTransitionManager.screen.classList.contains('sheet-transitioning'));
    assert.isFalse(
      SheetTransitionManager.overlay.classList.contains('visible'));
  });
});
