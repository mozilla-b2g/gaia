'use strict';

/* Unit test of browser_frame.js */
requireApp('system/js/browser_frame.js');

suite('browser class > ', function() {
  test('Simple browser frame instance creation..', function() {
    var browserFrame = new BrowserFrame({ url: 'unit-test.gaia' });
    assert.equal(browserFrame.element.getAttribute('mozbrowser'), 'true');
  });

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

