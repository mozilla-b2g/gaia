requireLib('presets.js');
requireLib('provider/local.js');

suite('presets', function() {
  'use strict';

  test('list', function() {
    assert.instanceOf(Calendar.Presets, Object);
  });
});
