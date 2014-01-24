'use strict';

/* Unit test of browser_frame.js */
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/test/unit/mock_settingslistener_installer.js');
requireApp('system/js/browser_frame.js');

var mocksForBrowserFrame = new MocksHelper([
  'SettingsListener'
]).init();

suite('browser class > ', function() {
  mocksForBrowserFrame.attachTestHelpers();
  suiteTeardown(function() {
    MockSettingsListener_Uninstall();
  });

  test('Simple browser frame instance creation..', function() {
    var browserFrame = new BrowserFrame({ url: 'unit-test.gaia' });
    assert.equal(browserFrame.element.getAttribute('mozbrowser'), 'true');
  });

  suite('mozapptype', function() {
    test('mozapptype: clock', function() {
      var b = new BrowserFrame({
        url: window.location.protocol + '//' + 'clock.gaiamobile.org'
      });
      assert.equal(b.element.getAttribute('mozapptype'), 'critical');
    });

    test('mozapptype: dialer', function() {
      var port = '';
      if (window.location.port !== '') {
        port = ':' + window.location.port;
      }
      var b = new BrowserFrame({
        url: window.location.protocol + '//' +
            'communications.gaiamobile.org' + port + '/dialer'
      });
      assert.equal(b.element.getAttribute('mozapptype'), 'critical');
    });

    test('mozapptype: other app', function() {
      var b = new BrowserFrame({
        url: window.location.protocol + '//' + 'other.gaiamobile.org'
      });
      assert.equal(b.element.getAttribute('mozapptype'), null);
    });
  });

  test('expect system message', function() {
    var b = new BrowserFrame({
      url: window.location.protocol + '//' + 'other.gaiamobile.org',
      manifestURL: window.location.protocol +
        '//' + 'other.gaiamobile.org/manifest.webapp'
    });
    assert.equal(b.element.getAttribute('expecting-system-message'),
      'expecting-system-message');

    var b2 = new BrowserFrame({
      url: window.location.protocol + '//' + 'other.gaiamobile.org'
    });
    assert.isNull(b2.element.getAttribute('expecting-system-message'));
  });
});

