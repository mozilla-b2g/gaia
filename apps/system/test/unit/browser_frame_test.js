/* globals BrowserFrame */

'use strict';

/* Unit test of browser_frame.js */
requireApp('system/js/browser_frame.js');

suite('browser class > ', function() {
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

    test('mozapptype: callscreen', function() {
      var port = '';
      if (window.location.port !== '') {
        port = ':' + window.location.port;
      }
      var b = new BrowserFrame({
        url: window.location.protocol + '//' + 'callscreen.gaiamobile.org'
      });
      assert.equal(b.element.getAttribute('mozapptype'), 'critical');
    });

    test('mozapptype: inputmethod', function() {
      var b = new BrowserFrame({
        url: window.location.protocol + '//' + 'keyboard.gaiamobile.org',
        isInputMethod: true
      });
      assert.equal(b.element.getAttribute('mozapptype'), 'inputmethod');
    });

    test('mozapptype: other app', function() {
      var b = new BrowserFrame({
        url: window.location.protocol + '//' + 'other.gaiamobile.org'
      });
      assert.equal(b.element.getAttribute('mozapptype'), null);
    });
  });

  test('set parent app manifestURL', function() {
    var b = new BrowserFrame({
      url: 'fake',
      parentApp: 'fake.parent.app/manifest.webapp'
    });

    assert.equal(b.element.getAttribute('parentapp'),
      'fake.parent.app/manifest.webapp');
  });

  test('expect system message', function() {
    var b = new BrowserFrame({
      isSystemMessage: true,
      url: window.location.protocol + '//' + 'other.gaiamobile.org',
      manifestURL: window.location.protocol +
        '//' + 'other.gaiamobile.org/manifest.webapp'
    });
    assert.equal(b.element.getAttribute('expecting-system-message'),
      'expecting-system-message');

    var b2 = new BrowserFrame({
      url: window.location.protocol + '//' + 'other.gaiamobile.org',
      manifestURL: window.location.protocol +
        '//' + 'other.gaiamobile.org/manifest.webapp'
    });
    assert.isNull(b2.element.getAttribute('expecting-system-message'));

    var b3 = new BrowserFrame({
      isSystemMessage: true,
      url: window.location.protocol + '//' + 'other.gaiamobile.org'
    });
    assert.isNull(b3.element.getAttribute('expecting-system-message'));
  });

  test('inputmethod app attributes', function() {
    var b = new BrowserFrame({
      url: window.location.protocol + '//' + 'keyboard.gaiamobile.org',
      isInputMethod: true
    });
    assert.equal(b.element.getAttribute('mozpasspointerevents'), 'true');
    assert.equal(b.element.getAttribute('ignoreuserfocus'), 'true');
  });

  test('private browsing attribute', function() {
    var b = new BrowserFrame({
      url: 'http://mozilla.org',
      isPrivate: true
    });
    assert.equal(b.element.getAttribute('mozprivatebrowsing'), 'true');
  });
});
