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
  var signinSection, settingsSection, trackingSection, loginButton, checkbox;

  mocksForFindMyDevice.attachTestHelpers();

  suiteSetup(function(done) {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = {
      once: function(callback) {
        callback();
      },
      localize: function(element, id) {
      },
    };

    realMozId = navigator.mozId;
    MockMozId = {
      onlogin: null,
      onlogout: null,
      onready: null,
      onerror: null,
      oncancel: null,

      watch: function(options) {
        this.onlogin = options.onlogin;
        this.onlogout = options.onlogout;
        this.onready = options.onready;
        this.onerror = options.onerror;

        setTimeout(function() {
          options.onready();
        });
      },

      request: function(options) {
        this.oncancel = options.oncancel;
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
      trackingSection = document.getElementById('findmydevice-tracking');
      checkbox = document.querySelector('#findmydevice-enabled input');
      loginButton = document.getElementById('findmydevice-login');

      // manually enable the loginButton
      loginButton.removeAttribute('disabled');

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

  test('bug 1030597 - prompt for login if onerror fires', function() {
    signinSection.hidden = true;
    settingsSection.hidden = true;
    MockMozId.onerror();
    assert.isTrue(settingsSection.hidden);
    assert.isFalse(signinSection.hidden);
  });

  test('show settings when logged in to FxA', function() {
    MockMozId.onlogin();
    assert.isFalse(settingsSection.hidden);
    assert.isTrue(signinSection.hidden);
  });

  test('ignore clicks when button is disabled', function() {
    loginButton.disabled = true;
    var onLoginClickSpy = sinon.spy(FindMyDevice, '_onLoginClick');
    loginButton.click();
    sinon.assert.notCalled(onLoginClickSpy);
    FindMyDevice._onLoginClick.restore();
  });

  test('enable button after watch fires onready', function() {
    loginButton.disabled = true;
    MockMozId.onready();
    assert.isFalse(!!loginButton.disabled);
  });

  test('enable button after watch fires onerror', function() {
    loginButton.disabled = true;
    MockMozId.onerror();
    assert.isFalse(!!loginButton.disabled);
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

  test('notify in settings panel when phone is tracked', function() {
    MockSettingsListener.mCallbacks['findmydevice.enabled'](false);
    assert.isTrue(trackingSection.hidden);
    MockSettingsListener.mCallbacks['findmydevice.enabled'](true);
    assert.isFalse(trackingSection.hidden);

    this.sinon.spy(navigator.mozL10n, 'localize');
    MockSettingsListener.mCallbacks['findmydevice.tracking'](true);
    assert.ok(navigator.mozL10n.localize.calledWith(
        trackingSection, 'findmydevice-active-tracking'));
    MockSettingsListener.mCallbacks['findmydevice.tracking'](false);
    assert.ok(navigator.mozL10n.localize.calledWith(
        trackingSection, 'findmydevice-not-tracking'));
    navigator.mozL10n.localize.reset();
  });

  test('prevent accidental auto-enable on FxA sign-in', function() {
    MockMozId.onlogout();
    loginButton.click();
    assert.equal(true, window.FindMyDevice._interactiveLogin,
      'ensure _interactiveLogin is true after login button is clicked');
    MockMozId.oncancel();
    assert.equal(false, window.FindMyDevice._interactiveLogin,
      'ensure _interactiveLogin is false after FxA cancel');
    MockMozId.onlogin();
    assert.equal(0, MockSettingsListener.getSettingsLock().locks.length,
      'ensure findmydevice.enabled was not set automatically on FxA login');
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    navigator.mozId = realMozId;
    window.loadJSON = realLoadJSON;
  });
});
