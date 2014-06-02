/* global MocksHelper */
/* global MockLoadJSON */
/* global HtmlImports */
/* global FindMyDevice */
/* global MockSettingsListener */

'use strict';

require('mock_load_json.js');

// require helpers for managing html
require('/shared/test/unit/load_body_html_helper.js');
require('/shared/js/html_imports.js');

require('/shared/test/unit/mocks/mocks_helper.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');

var mocksForFindMyDevice = new MocksHelper([
  'SettingsListener'
]).init();

suite('Find My Device panel > ', function() {
  var MockMozId, realMozId;
  var realL10n, realLoadJSON, subject;
  var signinSection, settingsSection, loginButton, checkbox;

  mocksForFindMyDevice.attachTestHelpers();

  suiteSetup(function(done) {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = {
      once: function(callback) {
        callback();
      }
    };

    realMozId = navigator.mozId;
    MockMozId = {
      onlogin: null,
      onlogout: null,
      onready: null,

      watch: function(options) {
        this.onlogin = options.onlogin;
        this.onlogout = options.onlogout;
        this.onready = options.onready;

        setTimeout(function() {
          options.onready();
        });
      },

      request: function() {
        // noop
      },
    };

    navigator.mozId = MockMozId;

    realLoadJSON = window.loadJSON;
    window.loadJSON = MockLoadJSON.loadJSON;

    // first, load settings app
    loadBodyHTML('/index.html');

    // next, insert fmd panel into page
    var importHook = document.createElement('link');
    importHook.setAttribute('rel', 'import');
    importHook.setAttribute('href', '/elements/findmydevice.html');
    document.head.appendChild(importHook);
    HtmlImports.populate(function onDOMReady() {
      // double-check panel is ready
      if (document.getElementById('findmydevice-signin') == null) {
        throw new Error('failed to load findmydevice panel into page');
      }

      // grab pointers to useful elements
      signinSection = document.getElementById('findmydevice-signin');
      settingsSection = document.getElementById('findmydevice-settings');
      loginButton = document.getElementById('findmydevice-login');
      checkbox = document.querySelector('#findmydevice-enabled input');

      require('/js/findmydevice.js', function() {
        subject = FindMyDevice;
        done();
      });
    });
  });

  test('prompt for login when logged out of FxA', function() {
    MockMozId.onlogout();
    assert.isFalse(signinSection.hidden);
    assert.isTrue(settingsSection.hidden);
  });

  test('show settings when logged in to FxA', function() {
    MockMozId.onlogin();
    assert.isFalse(settingsSection.hidden);
    assert.isTrue(signinSection.hidden);
  });

  test('auto-enable when logging in using the login button', function() {
    MockMozId.onlogout();
    loginButton.click();
    MockMozId.onlogin();

    var lock = MockSettingsListener.getSettingsLock().locks.pop();
    assert.deepEqual({
      'findmydevice.enabled': true
    }, lock, 'check whether findmydevice.enabled was set automatically');
  });

  test('bug 997310 - don\'t disable on non-interactive login', function() {
    MockMozId.onlogin();
    var nLocks = MockSettingsListener.getSettingsLock().locks.length;
    assert.equal(nLocks, 0, 'set no settings on non-interactive login');
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    navigator.mozId = realMozId;
    window.loadJSON = realLoadJSON;
  });
});
