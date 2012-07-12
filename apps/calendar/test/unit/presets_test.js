requireApp('calendar/js/presets.js');

suite('presets', function() {
  test('list', function() {
    assert.instanceOf(Calendar.Presets, Object);
  });
});
