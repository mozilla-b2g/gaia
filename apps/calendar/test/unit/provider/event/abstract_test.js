requireApp('calendar/test/unit/helper.js', function() {
  requireApp('calendar/js/provider/event/abstract.js');
});

suite('provider/event/abstract', function() {

  var subject;

  setup(function() {
    subject = new Calendar.Provider.Event.Abstract({
      title: 'one',
      description: 'foo'
    });
  });

  test('initializer', function() {
    assert.equal(subject.title, 'one');
    assert.equal(subject.description, 'foo');
  });

  test('#toJSON', function() {
    var date = new Date();
    var expected = {
      title: 'title',
      description: 'desc',
      location: 'loc',
      startDate: date,
      endDate: date
    };

    var output = new Calendar.Provider.Event.Abstract(
      expected
    ).toJSON();


    assert.deepEqual(expected, output);
  });

});
