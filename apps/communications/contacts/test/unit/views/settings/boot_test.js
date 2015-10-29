/* global MocksHelper */
/* global MockfbLoader */
/* global LazyLoader */
/* global SettingsUI */
/* global SettingsController */

'use strict';

require('/shared/js/lazy_loader.js');
require('/shared/test/unit/load_body_html_helper.js');

requireApp('communications/contacts/test/unit/mock_fb_loader.js');
requireApp('communications/contacts/views/settings/js/boot.js');

var mocksForSettingsBoot = new MocksHelper([
  'fbLoader'
]).init();

suite('Settings - Boot', function() {
  mocksForSettingsBoot.attachTestHelpers();

  setup(function() {
    loadBodyHTML('/contacts/views/settings/settings.html');
    this.sinon.stub(LazyLoader, 'load', function(files, cb) {
      cb();
    });
  });

  teardown(function() {
    document.body.innerHTML = '';
  });

  suite('DOMContentLoaded', function() {
    setup(function() {
      window.dispatchEvent(new CustomEvent('DOMContentLoaded'));
    });

    test(' > LazyLoader must be called twice', function() {
      assert.isTrue(LazyLoader.load.calledTwice);
    });

    test(' > First call must ensure localization and curtain', function() {
      var call = LazyLoader.load.getCall(0);
      assert.isTrue(Array.isArray(call.args[0]));
      assert.equal(call.args[0][0], '/shared/js/l10n.js');
      assert.equal(call.args[0][1], '/shared/pages/import/js/curtain.js');
    });

    test(' > Second call must check from DOM elements', function() {
      var call = LazyLoader.load.getCall(1);
      assert.equal(call.args[0][0].id, 'settings-wrapper');
      assert.equal(call.args[0][1].id, 'confirmation-message');
      assert.equal(call.args[0][2].id, 'statusMsg');
    });
  });

  suite('Loaded', function() {
    var realSettingsController,
        realSettingsUI,
        realFbLoader;

    suiteSetup(function() {
      realSettingsController = window.SettingsController;
      realSettingsUI = window.SettingsUI;

      window.SettingsController = {
        init: function foo() {}
      };

      window.SettingsUI = {
        init: function foo() {}
      };

      realFbLoader = window.fbLoader;
      window.fbLoader = MockfbLoader;
    });

    suiteTeardown(function() {
      window.SettingsController = realSettingsController;
      window.SettingsUI = realSettingsUI;
      window.fbLoader = realFbLoader;

      realSettingsController = null;
      realSettingsUI = null;
      realFbLoader = null;
    });

    setup(function() {
      this.sinon.spy(SettingsController, 'init');
      this.sinon.spy(SettingsUI, 'init');
      this.sinon.spy(window.fbLoader, 'load');
      window.dispatchEvent(new CustomEvent('load'));
    });

    test(' > Controller is initialized', function() {
      assert.isTrue(SettingsController.init.calledOnce);
    });

    test(' > UI is initialized', function() {
      assert.isTrue(SettingsUI.init.calledOnce);
    });

    test(' > FB loader is initialized', function() {
      assert.isTrue(window.fbLoader.load.calledOnce);
    });
  });
});
