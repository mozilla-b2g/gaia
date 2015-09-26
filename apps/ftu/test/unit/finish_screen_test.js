/* global FinishScreen, MocksHelper */

'use strict';

requireApp('ftu/test/unit/mock_screenlayout.js');

requireApp('ftu/js/finish_screen.js');
requireApp('ftu/js/utils.js');

suite('FinishScreen >', function() {
  var mocksHelperForFTU = new MocksHelper([
    'ScreenLayout'
  ]).init();

  mocksHelperForFTU.attachTestHelpers();

  suiteSetup(function() {
    mocksHelperForFTU.attachTestHelpers();
    loadBodyHTML('/index.html');
  });

  suiteTeardown(function() {
    document.body.innerHTML = '';
  });

  test(' init', function() {
    var spy = this.sinon.spy();
    window.addEventListener('panelready', spy);
    FinishScreen.init();

    // Is shown? We know by default the layout is tiny
    assert.isTrue(spy.calledOnce);
  });

  test(' show', function() {
    this.sinon.spy(window, 'close');
    // We call to FinishScreen
    FinishScreen.show();

    // Is shown? We know by default the layout is tiny
    assert.isTrue(
      document.getElementById('tutorial-finish-tiny').classList.contains('show')
    );
    // As is tiny, a click should be enough to close the app
    document.getElementById('tutorialFinished').click();
    assert.isTrue(window.close.calledOnce);
    // Reset the spy
    window.close.reset();
  });
});
