'use strict';
/* global loadBodyHTML, MockNavigatormozApps, appManager, MockL10n */

require('/shared/test/unit/mocks/mock_navigator_moz_apps.js');
require('/test/unit/mock_l10n.js');
require('/shared/test/unit/load_body_html_helper.js');
require('/shared/js/component_utils.js');
require('/shared/elements/gaia_confirm/script.js');
require('/shared/js/homescreens/confirm_dialog_helper.js');

suite('app_manager.js > ', function() {

  var realMozApps = null,
      realL10n = null,
      app = {},
      titleElement = null,
      bodyElement = null,
      cancelButton = null,
      confirmButton = null;

  suiteSetup(function(done) {
    loadBodyHTML('/index.html');
    realMozApps = navigator.mozApps;
    navigator.mozApps = MockNavigatormozApps;
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    require('/js/app_manager.js', done);
  });

  suiteTeardown(function() {
    navigator.mozApps = realMozApps;
    MockNavigatormozApps.mTeardown();
    navigator.mozL10n = realL10n;
    realL10n = realMozApps = null;
  });

  test('The library was initialized properly', function() {
    MockNavigatormozApps.mTriggerLastRequestSuccess(app);
    assert.equal(appManager.self, app);
  });

  suite('uninstall app', function() {
    var subject, dialog;
    setup(function() {
      subject = {
        name: 'hi',
        app: {}
      };

      window.dispatchEvent(new CustomEvent('gaiagrid-uninstall-mozapp', {
        'detail': subject
      }));

      dialog = document.querySelector('gaia-confirm');

      titleElement = dialog.querySelector('h1');
      bodyElement = dialog.querySelector('p');
      cancelButton = dialog.querySelector('.cancel');
      confirmButton = dialog.querySelector('.confirm');
    });

    test('Uninstall app', function(done) {
      assert.isTrue(titleElement.textContent.contains('delete-title{"name":"' +
                                                       subject.name + '"'));
      assert.isTrue(bodyElement.textContent.contains('delete-body{"name":"' +
                                                      subject.name + '"'));
      assert.equal(cancelButton.textContent, 'cancel');
      assert.equal(confirmButton.textContent, 'delete');
      assert.isTrue(confirmButton.classList.contains('danger'));

      var stub = sinon.stub(navigator.mozApps.mgmt, 'uninstall', function(app) {
        stub.restore();
        assert.equal(app, subject.app);
        done();
      });
      confirmButton.click();
    });
  });

});
