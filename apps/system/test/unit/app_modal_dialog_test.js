'use strict';

mocha.globals(['AppWindow', 'AppModalDialog', 'System', 'BaseUI']);


requireApp('system/test/unit/mock_l10n.js');
requireApp('system/test/unit/mock_orientation_manager.js');
requireApp('system/test/unit/mock_app_window.js');
require('/shared/js/template.js');

var mocksForAppModalDialog = new MocksHelper([
  'AppWindow'
]).init();

suite('system/AppModalDialog', function() {
  var stubById, realL10n, stubQuerySelector;
  mocksForAppModalDialog.attachTestHelpers();
  setup(function(done) {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    stubById = this.sinon.stub(document, 'getElementById');
    var e = document.createElement('div');
    stubQuerySelector = this.sinon.stub(e, 'querySelector');
    stubQuerySelector.returns(document.createElement('div'));
    stubById.returns(e);
    requireApp('system/js/system.js');
    requireApp('system/js/base_ui.js');
    requireApp('system/js/app_modal_dialog.js', done);
  });

  teardown(function() {
    navigator.mozL10n = realL10n;
    stubById.restore();
    stubQuerySelector.restore();
  });

  var fakeAppConfig1 = {
    url: 'app://www.fake/index.html',
    manifest: {},
    manifestURL: 'app://wwww.fake/ManifestURL',
    origin: 'app://www.fake'
  };

  var fakeAlertEvent = {
    type: 'mozbrowsermodalprompt',
    preventDefault: function() {},
    detail: {
      type: 'alert',
      unblock: function() {}
    }
  };

  var fakeConfirmEvent = {
    type: 'mozbrowsermodalprompt',
    preventDefault: function() {},
    detail: {
      type: 'confirm',
      unblock: function() {}
    }
  };

  var fakePromptEvent = {
    type: 'mozbrowsermodalprompt',
    preventDefault: function() {},
    detail: {
      type: 'prompt',
      unblock: function() {}
    }
  };

  test('New', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var md1 = new AppModalDialog(app1);
    assert.isDefined(md1.instanceID);
  });

  test('Alert', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var md1 = new AppModalDialog(app1);
    md1.handleEvent(fakeAlertEvent);

    assert.isTrue(md1.element.classList.contains('visible'));
    assert.isTrue(md1.elements.alert.classList.contains('visible'));
  });

  test('Confirm', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var md1 = new AppModalDialog(app1);
    md1.handleEvent(fakeConfirmEvent);

    assert.isTrue(md1.element.classList.contains('visible'));
    assert.isTrue(md1.elements.confirm.classList.contains('visible'));
  });

  test('Prompt', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var md1 = new AppModalDialog(app1);
    md1.handleEvent(fakePromptEvent);

    assert.isTrue(md1.element.classList.contains('visible'));
    assert.isTrue(md1.elements.prompt.classList.contains('visible'));
  });

});
