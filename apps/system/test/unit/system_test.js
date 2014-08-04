/* globals System, MocksHelper, MockAppWindowManager */
'use strict';

mocha.globals(['System']);

requireApp('system/test/unit/mock_app_window_manager.js');

var mocksForSystem = new MocksHelper([
  'AppWindowManager'
]).init();

suite('system/System', function() {
  mocksForSystem.attachTestHelpers();
  setup(function(done) {
    requireApp('system/js/system.js', done);
  });

  test('Busy loading if the active app is not loaded.', function() {
    this.sinon.stub(MockAppWindowManager, 'getActiveApp').returns({
      loaded: false
    });
    assert.isTrue(System.isBusyLoading());
  });
});
