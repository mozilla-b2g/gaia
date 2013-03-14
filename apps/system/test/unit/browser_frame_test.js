'use strict';

/* Unit test of browser_frame.js */
requireApp('system/js/browser_frame.js');

suite('browser class > ', function() {
  test('Simple browser frame instance creation..', function() {
    var browserFrame = new BrowserFrame('unit-test.gaia');
    assert.equal(browserFrame.element.getAttribute('mozbrowser'), 'true');
  });
});

