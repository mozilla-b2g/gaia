'use strict';


requireApp('system/test/unit/mock_l10n.js');
requireApp('system/test/unit/mock_orientation_manager.js');
requireApp('system/test/unit/mock_app_window.js');

var mocksForAppModalDialog = new MocksHelper([
  'AppWindow'
]).init();

suite('system/AppModalDialog', function() {
  var realL10n, app, md, fragment;
  mocksForAppModalDialog.attachTestHelpers();
  setup(function(done) {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    requireApp('system/js/system.js');
    requireApp('system/js/base_ui.js');

    requireApp('system/js/app_modal_dialog.js',
      function() {
        app = new AppWindow(fakeAppConfig1);
        md = new AppModalDialog(app);

        fragment = document.createElement('div');
        fragment.innerHTML = md.view();
        document.body.appendChild(fragment);

        done();
      }
    );
  });

  teardown(function() {
    navigator.mozL10n = realL10n;
    document.body.removeChild(fragment);
    fragment = null;
    md = null;
    app = null;
  });

  var fakeAppConfig1 = {
    url: 'app://www.fake/index.html',
    manifest: {},
    manifestURL: 'app://wwww.fake/ManifestURL',
    origin: 'app://www.fake',
    name: 'Fake Application'
  };

  var fakeAlertEvent = {
    type: 'mozbrowsermodalprompt',
    preventDefault: function() {},
    detail: {
      type: 'alert',
      title: 'alert title',
      message: 'alert message',
      unblock: function() {}
    }
  };

  var fakeConfirmEvent = {
    type: 'mozbrowsermodalprompt',
    preventDefault: function() {},
    detail: {
      type: 'confirm',
      title: 'confirm title',
      message: 'confirm message',
      unblock: function() {}
    }
  };

  var fakePromptEvent = {
    type: 'mozbrowsermodalprompt',
    preventDefault: function() {},
    detail: {
      type: 'prompt',
      title: 'prompt title',
      message: 'prompt message',
      unblock: function() {}
    }
  };

  var fakeCustomPromptEvent = {
    type: 'mozbrowsermodalprompt',
    preventDefault: function() {},
    detail: {
      type: 'custom-prompt',
      unblock: function() {},
      buttons: [{'messageType': 'custom', 'message': 'Resend'},
                {'messageType': 'builtin', 'message': 'cancel'}]
    }
  };

  function attachModalDialog() {
  }

  test('New', function() {
    assert.isDefined(md.instanceID);
  });

  test('Alert', function() {
    md.handleEvent(fakeAlertEvent);

    assert.isTrue(md.element.classList.contains('visible'));
    assert.isTrue(md.elements.alert.classList.contains('visible'));
    assert.equal(md.elements.alertTitle.innerHTML, 'alert title');
    assert.equal(md.elements.alertMessage.innerHTML, 'alert message');
  });

  test('Confirm', function() {
    md.handleEvent(fakeConfirmEvent);

    assert.isTrue(md.element.classList.contains('visible'));
    assert.isTrue(md.elements.confirm.classList.contains('visible'));
    assert.equal(md.elements.confirmTitle.innerHTML, 'confirm title');
    assert.equal(md.elements.confirmMessage.innerHTML, 'confirm message');
  });

  test('Prompt', function() {
    md.handleEvent(fakePromptEvent);

    assert.isTrue(md.element.classList.contains('visible'));
    assert.isTrue(md.elements.prompt.classList.contains('visible'));
    assert.equal(md.elements.promptTitle.innerHTML, 'prompt title');
    assert.equal(md.elements.promptMessage.innerHTML, 'prompt message');
  });

  test('CustomPrompt', function() {
    md.handleEvent(fakeCustomPromptEvent);

    assert.isTrue(md.element.classList.contains('visible'));
    assert.isTrue(md.elements.customPrompt.classList.contains('visible'));
  });

  test('Ignore Dialog Titles containing App Origin URL', function() {
    var fakeAlertBadTitleEvent = fakeAlertEvent;
    fakeAlertBadTitleEvent.detail.title = fakeAppConfig1.url;

    md.handleEvent(fakeAlertBadTitleEvent);

    assert.isTrue(md.element.classList.contains('visible'));
    assert.isTrue(md.elements.alert.classList.contains('visible'));
    assert.equal(md.elements.alertTitle.innerHTML, fakeAppConfig1.name);
  });

});
