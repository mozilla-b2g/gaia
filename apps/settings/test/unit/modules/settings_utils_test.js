/* global Settings, MockSettings */
requireApp('settings/test/unit/mock_settings.js');

mocha.globals(['Settings']);

suite('SettingsUtils', function() {
  'use strict';

  var realSettings;
  var settingsUtils;
  var settingsService;
  var map = {
    '*': {
      'modules/settings_service': 'unit/mock_settings_service',
      'shared/lazy_loader': 'shared_mocks/mock_lazy_loader'
    }
  };

  suiteSetup(function() {
    realSettings = window.Settings;
    window.Settings = MockSettings;
  });

  suiteTeardown(function() {
    window.Settings = realSettings;
  });

  setup(function(done) {
    testRequire([
      'modules/settings_utils',
      'unit/mock_settings_service'
    ], map, function(SettingsUtils, MockSettingsService) {
      settingsUtils = SettingsUtils;
      settingsService = MockSettingsService;
      done();
    });
  });

  suite('openDialog', function() {
    var onSubmitCallback;
    var onResetCallback;
    var fakePanel;
    var fakeSubmitButton;
    var fakeResetButton;

    setup(function() {
      this.sinon.spy(settingsService, 'navigate');

      fakePanel = document.createElement('div');
      fakePanel.id = 'fakePanel';
      fakeSubmitButton = createButton('submit');
      fakeResetButton = createButton('reset');

      fakePanel.appendChild(fakeSubmitButton);
      fakePanel.appendChild(fakeResetButton);
      document.body.appendChild(fakePanel);

      onSubmitCallback = this.sinon.stub();
      onResetCallback = this.sinon.stub();
    });

    teardown(function() {
      document.body.innerHTML = '';
    });

    test('if currentDialog is the same, do nothing', function() {
      Settings.currentPanel = '#dialog0';
      settingsUtils.openDialog('dialog0', {});
      assert.isFalse(settingsService.navigate.called);
    });
    
    test('if currentPanel is different, then press submit button', function() {
      Settings.currentPanel = '#root';
      settingsUtils.openDialog(fakePanel.id, {
        onSubmit: onSubmitCallback
      });
      
      // trigger the button to check following logics
      fakeSubmitButton.onclick();

      var firstNavigate = settingsService.navigate.getCall(0);
      var secondNavigate = settingsService.navigate.getCall(1);

      assert.equal(firstNavigate.args[0], fakePanel.id,
        'we did navigate to that panel');
      assert.isTrue(onSubmitCallback.called);
      assert.equal(secondNavigate.args[0], 'root',
        'we did navigate back to root after clicking submit button');
    });

    test('if currentPanel is different, then press reset button', function() {
      Settings.currentPanel = '#root';
      settingsUtils.openDialog(fakePanel.id, {
        onReset: onResetCallback
      });

      // trigger the button to check following logics
      fakeResetButton.onclick();

      var firstNavigate = settingsService.navigate.getCall(0);
      var secondNavigate = settingsService.navigate.getCall(1);

      assert.equal(firstNavigate.args[0], fakePanel.id,
        'we did navigate to that panel');
      assert.isTrue(onResetCallback.called);
      assert.equal(secondNavigate.args[0], 'root',
        'we did navigate back to root after clicking submit button');
    });
  });

  suite('loadTemplate', function() {
    var spyCallback;

    setup(function() {
      spyCallback = this.sinon.spy();
    });

    test('with element', function() {
      var element = {
        innerHTML: 'html'
      };
      this.sinon.stub(document, 'getElementById').returns(element);
      settingsUtils.loadTemplate('real', spyCallback);
      assert.isTrue(spyCallback.calledWith(element.innerHTML));
    });

    test('without element', function() {
      this.sinon.stub(document, 'getElementById').returns(null);
      settingsUtils.loadTemplate('fake', spyCallback);
      assert.isTrue(spyCallback.calledWith(null));
    });
  });

  function createButton(type) {
    var button = document.createElement('button');
    button.setAttribute('type', type);
    return button;
  }
});
