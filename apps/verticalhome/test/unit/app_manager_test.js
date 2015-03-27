'use strict';
/* global loadBodyHTML, MockNavigatormozApps, appManager, MockL10n */

require('/shared/test/unit/mocks/mock_navigator_moz_apps.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/load_body_html_helper.js');
require('/shared/js/component_utils.js');
require('/shared/elements/gaia_confirm/script.js');
require('/shared/js/homescreens/confirm_dialog_helper.js');

suite('app_manager.js > ', function() {

  var realMozApps = null,
      realL10n = null,
      app = {};

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

  test('Can\'t show delete dialog more than once', function() {
    var showDialogSpy = sinon.spy();
    sinon.stub(window, 'ConfirmDialogHelper').returns({ show: showDialogSpy });

    var removeItemEvent = new CustomEvent('removeitem',
      { detail:
        { detail: { type: null } }
      });

    appManager.handleEvent(removeItemEvent);
    assert(appManager.dialogVisible);

    appManager.handleEvent(removeItemEvent);
    assert(showDialogSpy.calledOnce);
  });

});
