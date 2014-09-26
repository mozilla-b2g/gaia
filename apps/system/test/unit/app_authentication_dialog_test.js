'use strict';
/* global AppAuthenticationDialog */
/* global AppWindow */
/* global MocksHelper */
/* global MockL10n */

requireApp('system/test/unit/mock_app_window.js');
require('/shared/test/unit/mocks/mock_l10n.js');

var mocksForAppAuthDialog = new MocksHelper([
  'AppWindow'
]).init();

suite('system/AppAuthenticationDialog', function() {
  var stubById, stubQuerySelector, realL10n;
  mocksForAppAuthDialog.attachTestHelpers();
  setup(function(done) {
    stubById = this.sinon.stub(document, 'getElementById');
    var e = document.createElement('div');
    stubQuerySelector = this.sinon.stub(e, 'querySelector');
    stubQuerySelector.returns(document.createElement('div'));
    stubById.returns(e);
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    requireApp('system/js/system.js');
    requireApp('system/js/base_ui.js');
    requireApp('system/js/app_authentication_dialog.js', done);
  });

  teardown(function() {
    stubById.restore();
    stubQuerySelector.restore();
    navigator.mozL10n = realL10n;
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
    var evt = new CustomEvent('mozbrowserusernameandpasswordrequired', {
      detail: {
        host: '',
        realm: '',
        authenticate: function() {}
      }
    });
    var stubStopPropagation = this.sinon.stub(evt, 'stopPropagation');
    auth1.handleEvent(evt);
    auth1.hide();

    assert.isFalse(auth1.element.classList.contains('visible'));

    auth1.show();

    assert.isTrue(auth1.element.classList.contains('visible'));
    assert.isTrue(stubStopPropagation.called);
  });
});
