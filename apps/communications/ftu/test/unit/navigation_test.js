'use strict';

// window[0] is created when we create the external url loader frame
mocha.globals(['0']);

requireApp('communications/ftu/test/unit/mock_ui_manager.js');
requireApp('communications/ftu/js/navigation.js');

var mocksHelperForNavigation = new MocksHelper([
  'UIManager'
]);
mocksHelperForNavigation.init();

suite('navigation >', function() {
  var mocksHelper = mocksHelperForNavigation;

  var container, progressBar;

  setup(function() {
    container = document.createElement('div');

    var markup =
      '<menu role="navigation" id="nav-bar" class="forward-only">' +
      '  <button id="back" class="button-left back">' +
      '     <span></span>' +
      '  </button>' +
      '  <button class="recommend forward" id="forward">' +
      '    <span></span>' +
      '  </button>' +
      ' <button class="recommend" id="wifi-join-button"></button>' +
      '</menu>' +
      '<section id="activation-screen" role="region" ' +
      '  class="skin-organic no-options">' +
      '  <ol id="progress-bar" class="step-state"></ol>' +
      '</section>' +
      '<section role="region" id="external-url-loader" class="external">' +
      '</section>';

    container.insertAdjacentHTML('beforeend', markup);

    progressBar = container.querySelector('#progress-bar');

    document.body.appendChild(container);

    mocksHelper.setup();

    Navigation.init();
  });

  teardown(function() {
    mocksHelper.teardown();
    container.parentNode.removeChild(container);
  });

  suiteSetup(function() {
    mocksHelper.suiteSetup();
  });

  suiteTeardown(function() {
    mocksHelper.suiteTeardown();
  });

  suite('external-url-loader >', function() {
    setup(function(done) {
      document.location.hash = Navigation.externalUrlLoaderSelector;
      setTimeout(done.bind(null, undefined), 100);
    });

    test('progress bar is hidden', function() {
      assert.equal(progressBar.className, 'hidden');
    });
  });
});
