'use strict';

mocha.globals(['SettingsListener', 'AppError']);

/* Unit test of AppError (error.js) */
requireApp('system/test/unit/mock_app.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');


suite('system/appError', function() {

  var app;
  var mockFrame; // moz browser iframe container
  var mockBrowserFrame; // moz borwser iframe
  var appError;
  var realSettingsListener;
  var realL10n;

  function triggerOverlay() {
    mockBrowserFrame.dispatchEvent(new CustomEvent('mozbrowsererror', {
      detail: { type: 'other' }
    }));
  }

  suiteSetup(function(done) {
    realSettingsListener = window.SettingsListener;
    window.SettingsListener = MockSettingsListener;
    realL10n = navigator.mozL10n;
    navigator.mozL10n = {
      get: function() {}
    };

    requireApp('system/js/error.js', done);
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    window.SettingsListener = realSettingsListener;
  });

  setup(function() {
    app = new MockApp();

    mockFrame = document.createElement('div');
    mockBrowserFrame = document.createElement('div');
    mockFrame.appendChild(mockBrowserFrame);
    document.body.appendChild(mockFrame);
    app.frame = mockFrame;
    app.iframe = mockBrowserFrame;

    appError = new AppError(app);
  });

  test('test appError initialization', function() {
    assert.include(appError, 'app');
    assert.include(appError, 'reloading');
  });

  test('test overlay rendering', function(done) {
    var show = sinon.spy(appError, 'show');
    var view = sinon.spy(appError, 'view');
    triggerOverlay();
    setTimeout(function() {
      assert.isTrue(show.called);
      assert.isTrue(view.called);
      assert.ok(document.body.querySelector('.appError'));
      done();
    });
  });
});
