requireApp('calendar/js/provider/calendar_model.js');
requireApp('calendar/js/provider/local.js');

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
