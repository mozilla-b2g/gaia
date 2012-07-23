requireApp('calendar/test/unit/helper.js', function() {
  requireApp('calendar/js/provider/calendar/abstract.js');
});

suite('calendar/provider/calendar/abstract', function() {

  var subject;
  var provider;
  var Cal;

  suiteSetup(function() {
    provider = function() {};
    Cal = Calendar.Provider.Calendar.Abstract;
  });

  setup(function() {
    subject = new Cal(provider, {
      name: 'test'
    });
  });

  test('initialization', function() {
    assert.equal(subject.provider, provider);
    assert.equal(subject.name, 'test');
  });

  test('calendarType', function() {
    assert.equal(subject.calendarType, 'Abstract');
  });

  test('#localizeError', function() {
    var result = subject.localizeError('404', 'foo');
    assert.instanceOf(result, Error);
    assert.equal(result.message, subject.codes['404'] + ' (foo)');
  });

  test('#toJSON', function() {
    var write = {
      id: '/foo',
      url: 'url',
      name: 'name',
      color: 'color',
      description: 'desc',
      syncToken: 'sync',
      updatedAt: 'updatedAt',
      createdAt: 'createdAt'
    };

    for (var key in write) {
      if (write.hasOwnProperty((key))) {
        subject[key] = write[key];
      }
    }
    write.calendarType = 'Abstract';
    write.id = write.url;

    var result = subject.toJSON();


    for (key in write) {
      if (write.hasOwnProperty(key)) {
        assert.equal(result[key], subject[key]);
      }
    }
  });

});
