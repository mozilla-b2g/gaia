requireApp('calendar/js/presets.js');
requireApp('calendar/js/provider/local.js');

suite('presets', function() {
  test('list', function() {
    assert.instanceOf(Calendar.Presets, Object);
  });
});
