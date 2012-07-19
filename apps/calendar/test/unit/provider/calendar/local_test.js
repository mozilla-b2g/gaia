requireApp('calendar/test/unit/helper.js', function() {
  requireLib('provider/calendar/abstract.js');
  requireLib('provider/calendar/local.js');
  requireLib('provider/local.js');
});

suite('provider/calendar/local', function() {

  var subject;
  var provider;

  setup(function() {
    provider = new Calendar.Provider.Local();
    subject = new Calendar.Provider.Calendar.Local(provider, {
      id: 'uuid1'
    });
  });

  test('initialization', function() {
    assert.equal(subject.provider, provider);
    assert.equal(subject.id, 'uuid1');
    assert.instanceOf(subject, Calendar.Provider.Calendar.Abstract);
  });

  test('#calendarType', function() {
    assert.equal(subject.calendarType, 'Local');
  });

});
