/* global loadBodyHTML, MockNavigatorMozMobileConnections */
'use strict';

require('/shared/test/unit/load_body_html_helper.js');
require('/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');

suite('CallBarringPanel', function() {
  var modules = [
    'panels/call_barring/panel'
  ];
  var map = {
    '*': {
      'modules/settings_panel': 'MockSettingsPanel',
      'panels/call_barring/call_barring': 'MockCallBarring'
    }
  };

  var realDsdsSettings,
      realMozMobileConnections;

  suiteSetup(function() {
    realDsdsSettings = window.DsdsSettings;
    window.DsdsSettings = {
      getIccCardIndexForCallSettings: function() {
        return 0;
      }
    };

    realMozMobileConnections = navigator.mozMobileConnections;
    navigator.mozMobileConnections = MockNavigatorMozMobileConnections;

  });

  setup(function(done) {
    // Create a new requirejs context
    var requireCtx = testRequire([], map, function() {});
    var that = this;

    loadBodyHTML('_call_cb_settings.html');

    // Define MockSettingsPanel
    define('MockSettingsPanel', function() {
      return function(options) {
        return {
          init: options.onInit,
          beforeShow: options.onBeforeShow,
          show: options.onShow,
          hide: options.onHide
        };
      };
    });

    // Define MockCallBarring
    this.mockCallBarring = {
      init: function() {},
      refresh: function() {}
    };
    define('MockCallBarring', function() {
      return function() {
        return that.mockCallBarring;
      };
    });

    requireCtx(modules, function(CallBarringPanel) {
      that.panel = CallBarringPanel();
      done();
    });
  });

  suiteTeardown(function() {
    window.DsdsSettings = realDsdsSettings;
    navigator.mozMobileConnections = realMozMobileConnections;
  });

  test('init display module with correct data', function() {
    var initObject = {
      'mobileConnection': MockNavigatorMozMobileConnections[0],
      'voiceServiceClassMask':
        MockNavigatorMozMobileConnections[0].ICC_SERVICE_CLASS_VOICE
    };
    this.sinon.stub(this.mockCallBarring, 'init');
    this.panel.init(document.body);
    assert.ok(this.mockCallBarring.init.calledWith(initObject));
  });

  test('listen to panelready before showing', function() {
    this.sinon.stub(window, 'addEventListener');
    this.panel.init(document.body);
    this.panel.beforeShow(document.body);
    assert.isTrue(window.addEventListener.calledWith('panelready'));

  });

  test('stop listening when hiding', function() {
    this.sinon.stub(window, 'removeEventListener');
    this.panel.init(document.body);
    this.panel.hide(document.body);
    assert.isTrue(window.removeEventListener.calledWith('panelready'));
  });
});
