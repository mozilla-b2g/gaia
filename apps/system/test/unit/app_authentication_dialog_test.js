'use strict';
/* global AppAuthenticationDialog */
/* global AppWindow */
/* global MocksHelper */

requireApp('system/test/unit/mock_app_window.js');

var mocksForAppAuthDialog = new MocksHelper([
  'AppWindow'
]).init();

suite('system/AppAuthenticationDialog', function() {
  var stubById, stubQuerySelector;
  mocksForAppAuthDialog.attachTestHelpers();
  setup(function(done) {
    stubById = this.sinon.stub(document, 'getElementById');
    var e = document.createElement('div');
    stubQuerySelector = this.sinon.stub(e, 'querySelector');
    stubQuerySelector.returns(document.createElement('div'));
    stubById.returns(e);

    requireApp('system/js/system.js');
    requireApp('system/js/base_ui.js');
    requireApp('system/js/app_authentication_dialog.js', done);
  });

  teardown(function() {
    stubById.restore();
    stubQuerySelector.restore();
  });

  var fakeAppConfig1 = {
    url: 'app://www.fake/index.html',
    manifest: {},
    manifestURL: 'app://wwww.fake/ManifestURL',
    origin: 'app://www.fake'
  };

  test('new', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var auth1 = new AppAuthenticationDialog(app1);
    assert.ok(app1);
    assert.ok(auth1);
  });

  test('show/hide', function() {
    var app1 = new AppWindow(fakeAppConfig1);

    var auth1 = new AppAuthenticationDialog(app1);
    auth1.handleEvent({
      type: 'mozbrowserusernameandpasswordrequired',
      preventDefault: function() {},
      detail: {
        host: '',
        realm: '',
        authenticate: function() {}
      }
    });
    auth1.hide();

    assert.isFalse(auth1.element.classList.contains('visible'));

    auth1.show();

    assert.isTrue(auth1.element.classList.contains('visible'));
  });
});
