/* globals BaseModule, MocksHelper, MockNavigatorSettings,
           RoamingWarningSystemDialog */

'use strict';


requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/settings_core.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/system_dialog.js');
requireApp('system/js/roaming_warning_system_dialog.js');

var mocksForRoamingWarningSystemDialog = new MocksHelper([
  'NavigatorSettings'
]).init();

suite('Roaming Warning System Dialog', function() {
  var subject, settingsCore, realMozSettings;

  mocksForRoamingWarningSystemDialog.attachTestHelpers();

  suiteSetup(function() {
    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
    MockNavigatorSettings.mSyncRepliesOnly = true;
  });

  suiteTeardown(function() {
    navigator.mozSettings = realMozSettings;
  });

  setup(function() {
    settingsCore = BaseModule.instantiate('SettingsCore');
    settingsCore.start();
    this.sinon.stub(document, 'querySelector')
        .returns(document.createElement('div'));
    this.sinon.stub(document, 'getElementById')
        .returns(document.createElement('div'));
    RoamingWarningSystemDialog.prototype.containerElement =
      document.createElement('div');
    subject = new RoamingWarningSystemDialog();
  });

  teardown(function() {
    settingsCore.stop();
  });

  test('ok: should prevent default to keep keyboard open', function() {
    var fakeMouseDownEvt = new CustomEvent('mousedown');
    this.sinon.stub(fakeMouseDownEvt, 'preventDefault');
    subject.ok.dispatchEvent(fakeMouseDownEvt);
    assert.isTrue(fakeMouseDownEvt.preventDefault.called);
  });

  test('cancel: should prevent default to keep keyboard open', function() {
    var fakeMouseDownEvt = new CustomEvent('mousedown');
    this.sinon.stub(fakeMouseDownEvt, 'preventDefault');
    subject.cancel.dispatchEvent(fakeMouseDownEvt);
    assert.isTrue(fakeMouseDownEvt.preventDefault.called);
  });

  test('should set data connection', function() {
    subject.enableRoaming();
    assert.isTrue(MockNavigatorSettings.mSettings['ril.data.enabled'], true);
  });
});
