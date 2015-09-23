'use strict';

suite('Accessibility Panel > ', function() {

  var modules = [
    'panels/accessibility/panel',
    'shared/settings_listener',
    'unit/mock_settings_panel'
  ];
  var map = {
    '*': {
      'modules/settings_panel': 'unit/mock_settings_panel',
      'shared/settings_listener': 'shared_mocks/mock_settings_listener'
    }
  };

  var settingsListener;

  suiteSetup(function(done) {
    // Create a new requirejs context
    var requireCtx = testRequire([], map, function() {});
    var self = this;

    requireCtx(modules, function(AccessibilityPanel, MockSettingsListener,
                                 MockSettingsPanel) {
      MockSettingsPanel.mInnerFunction = options => Object.assign({}, options);

      self.panel = AccessibilityPanel();

      settingsListener = MockSettingsListener;
      settingsListener.observe = sinon.spy();
      settingsListener.unobserve = sinon.spy();
      done();
    });
  });

  suite('panel initialized', function() {
    setup(function() {
      this.panel.onInit(document.body);
    });
    test('settings listener observer attached', function() {
      assert(settingsListener.observe.
        calledWith('accessibility.screenreader'));
      assert(settingsListener.observe.
        calledWith('accessibility.colors.enable'));
      assert(settingsListener.observe.
        calledWith('accessibility.monoaudio.enable'));
    });
  });
});
