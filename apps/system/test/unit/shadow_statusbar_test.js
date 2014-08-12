/* global AppWindow, ShadowStatusBar, MocksHelper */
'use strict';

require('/shared/test/unit/mocks/mock_l10n.js');
requireApp('system/test/unit/mock_app_window.js');

var mocksForShadowStatusBar = new MocksHelper([
  'AppWindow'
]).init();

suite('system/ShadowStatusBar', function() {
  mocksForShadowStatusBar.attachTestHelpers();

  setup(function(done) {
    this.sinon.useFakeTimers();

    requireApp('system/js/system.js');
    requireApp('system/js/base_ui.js');
    requireApp('system/js/shadow_statusbar.js', done);
  });

  var fakeAppConfig = {
    url: 'app://www.fake/index.html'
  };

  test('it should broadcast touchstart event', function() {
    var app = new AppWindow(fakeAppConfig);
    var ssb = new ShadowStatusBar(app);
    ssb.handleEvent(new CustomEvent('_shadowtouchtart'));
    assert.isFalse(ssb.titleBar.classList.contains('dragged'));
    ssb.handleEvent(new CustomEvent('_shadowtouchend'));
    assert.isTrue(ssb.titleBar.classList.contains('dragged'));
  });
});
