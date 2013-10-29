'use strict';

mocha.globals(['AppWindow', 'System', 'BaseUI', 'AppAuthenticationDialog']);

requireApp('system/test/unit/mock_app_window.js');

new MocksHelper([
  'AppWindow'
]).init().attachTestHelpers();

suite('system/AppAuthenticationDialog', function() {
  var clock, stubById;
  setup(function(done) {
    clock = sinon.useFakeTimers();

    stubById = this.sinon.stub(document, 'getElementById');
    stubById.returns(document.createElement('div'));
    requireApp('system/js/system.js');
    requireApp('system/js/base_ui.js');
    requireApp('system/js/app_authentication_dialog.js', done);
  });

  teardown(function() {
    clock.restore();
    stubById.restore();
  });

  var fakeAppConfig1 = {
    url: 'app://www.fake/index.html',
    manifest: {},
    manifestURL: 'app://wwww.fake/ManifestURL',
    origin: 'app://www.fake'
  };

  test('new', function() {
    var app = new AppWindow(fakeAppConfig1);
    var auth = new AppAuthenticationDialog(app);
  });
});
