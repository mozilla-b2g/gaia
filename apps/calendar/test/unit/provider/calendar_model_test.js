requireApp('calendar/test/unit/helper.js', function() {
  requireLib('provider/calendar_model.js');
  requireLib('provider/local.js');
});

suite('provider/calendar_model', function() {

  var subject;
  var provider;

  setup(function() {
    provider = new Calendar.Provider.Local();
    subject = new Calendar.Provider.CalendarModel(provider, {
      color: 'foo',
      id: 'local-home'
    });
  });

  test('initialization', function() {
    assert.equal(subject.provider, provider);
    assert.ok(subject.id);
  });

});
