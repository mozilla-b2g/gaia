requireApp('calendar/test/unit/helper.js', function() {
  requireLib('presets.js');
  requireLib('provider/local.js');
});

suite('presets', function() {
  test('list', function() {
    assert.instanceOf(Calendar.Presets, Object);
  });
});
