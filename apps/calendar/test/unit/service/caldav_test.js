requireApp('calendar/test/unit/helper.js', function() {
  requireLib('ext/caldav.js');
  requireLib('service/caldav.js');
});

suite('service/caldav', function() {

  var subject;
  var con;
  var service;

  var user = 'jlal';
  var domain = 'google.com';
  var url = '/';
  var password = 'foo';

  var Resource;
  var Finder;

  var fixtures = {};

  suiteSetup(function(done) {
    testSupport.calendar.loadSample('single_event.ics', function(err, data) {
      if (err) {
        done(err);
        return;
      }
      fixtures['singleEvent'] = data.trim();
      done();
    });
  });

  function icalFactory() {
    return ICAL.parse(fixtures.singleEvent);
  }

  function accountFactory(results) {
    if (typeof(results) === 'undefined') {
      results = {};
    }

    var defaults = {
      url: url,
      domain: domain,
      password: password,
      user: user
    };

    var key;

    for (key in defaults) {
      if (!(key in results)) {
        results[key] = defaults[key];
      }
    }

    return new Resource(con, results);
  }

  function calendarFactory(results) {
    if (typeof(results) === 'undefined') {
      results = {};
    }

    var defaults = {
      url: 'url',
      name: 'name',
      color: 'color',
      ctag: 'token',
      description: 'foo'
    };

    var key;

    for (key in defaults) {
      if (!(key in results)) {
        results[key] = defaults[key];
      }
    }

    return new Resource(con, results);
  }

  function caldavEventFactory() {
    var ical = icalFactory();

    return {
      'calendar-data': {
        status: 200,
        value: ical
      }
    };
  };

  suiteSetup(function() {
    Resource = Caldav.Resources.Calendar;
    Finder = Caldav.Request.Resources;
  });

  setup(function() {
    service = new Calendar.Responder();
    subject = new Calendar.Service.Caldav(service);
    con = new Caldav.Connection({
      user: user,
      password: password,
      domain: domain
    });
  });

  test('initalizer', function() {
    assert.equal(subject.service, service);
  });

  test('global xhr', function() {
    var xhr = Caldav.Xhr;
    var expected = {
      mozSystem: true
    };

    assert.deepEqual(xhr.prototype.globalXhrOptions, expected);
  });

  test('event routing', function() {
    var events = [
      'getAccount',
      'findCalendars',
      'getCalendar',
      'getEvents'
    ];

    events.forEach(function(event) {
      var calledWith;

      subject[event] = function() {
        calledWith = arguments;
      }

      service.emit(event, 1, 2, 3, 4);

      assert.deepEqual(
        calledWith,
        [1, 2, 3, 4],
        'should route event to: ' + event
      );
    });
  });

  test('#_requestEvents', function() {
    var cal = calendarFactory();
    var result = subject._requestEvents(
      con, cal
    );

    assert.instanceOf(result, Caldav.Request.CalendarQuery);
    assert.equal(result.connection, con);
  });

  test('#_requestCalendars', function() {
    var result = subject._requestCalendars(
      con, url
    );

    assert.equal(result.connection, con);
    assert.equal(result.url, url);

    assert.instanceOf(
      result,
      Finder
    );

    assert.equal(
      result._resources.calendar,
      Resource
    );

    var tags = result._props.join('');
    assert.ok(tags);
    assert.include(tags, 'calendar-color');
    assert.include(tags, 'calendar-description');
    assert.include(tags, 'displayname');
    assert.include(tags, 'resourcetype');
    assert.include(tags, 'getctag');
  });

  test('#_requestHome', function() {
    var result = subject._requestHome(
      con, url
    );

    assert.equal(result.connection, con);
    assert.equal(result.url, url);

    assert.instanceOf(
      result,
      Caldav.Request.CalendarHome
    );
  });

  test('#_formatCalendar', function() {
    var cal = calendarFactory();
    var result = subject._formatCalendar(cal);

    assert.equal(result.id, cal.url);
    assert.equal(result.url, cal.url);
    assert.equal(result.name, cal.name);
    assert.equal(result.syncToken, cal.ctag);
    assert.equal(result.description, cal.description);
    assert.equal(result.color, cal.color);
  });

  test('#_formatEvent', function() {
    var parsed = ICAL.parse(fixtures['singleEvent']);
    var result = subject._formatEvent(parsed);

    // look at single_event.ics for
    // the correct values.
    assert.equal(result.title, 'Summary Name');
    assert.equal(result.description, 'ICAL Description');
    assert.equal(result.location, 'My Loc');

    assert.deepEqual(
      result._rawData.value[0],
      ICAL.parse(fixtures['singleEvent']).value[0]
    );

    var start = result.startDate.valueOf();
    var end = result.endDate.valueOf();

    // June 30th 2012 6pm
    var expectedStart = new Date(
      2012,
      5,
      30,
      6
    ).valueOf();


    // June 30th 2012 7pm
    var expectedEnd = new Date(
      2012,
      5,
      30,
      7
    ).valueOf();

    assert.equal(start, expectedStart, 'start date');
    assert.equal(end, expectedEnd, 'end date');
  });

  test('#getAccount', function(done) {
    var calledWith;
    var given = { url: 'foo', domain: 'google' };
    var result = {};

    subject._requestHome = function() {
      calledWith = arguments;
      return {
        send: function(callback) {
          setTimeout(function() {
            callback(result);
          }, 0);
        }
      };
    };

    subject.getAccount(given, function(data) {
      done(function() {
        assert.deepEqual(data, result);
        assert.instanceOf(calledWith[0], Caldav.Connection);
        assert.equal(calledWith[0].domain, given.domain);
        assert.equal(calledWith[1], given.url);
      });
    });
  });

  suite('#streamEvents', function() {
    var query;
    var givenAcc;
    var givenCal;
    var calledWith;

    setup(function() {
      var realRequest = subject._requestEvents;
      var givenCal = calendarFactory();
      var givenAcc = accountFactory();

      // spy on request events
      subject._requestEvents = function() {
        calledWith = arguments;

        // get real query
        query = realRequest.apply(this, arguments);

        // when query is 'sent' firecallback
        // but don't actually send it
        query.send = function() {
          var cb = arguments[arguments.length - 1];
          setTimeout(function() {
            cb(null);
          }, 0);
        };

        // return real query
        return query;
      };
    });

    test('#streamEvents', function(done) {
      var stream = new Calendar.Responder();
      var events = [];
      var cals = {
        'one': caldavEventFactory(),
        'two': caldavEventFactory()
      };

      stream.on('data', function(data) {
        events.push(data);
      });

      function formatCalendar(id) {
        var data = cals[id]['calendar-data'];
        return subject._formatEvent(
          data.value
        );
      }

      // cb fires in next turn of event loop.
      subject.streamEvents(givenAcc, givenCal, stream, function(err, data) {
        done(function() {
          assert.ok(!err);
          assert.ok(!data);

          assert.equal(events.length, 2);

          assert.deepEqual(
            events[0],
            formatCalendar('one'),
            'should emit first cal'
          );

          assert.deepEqual(
            events[1],
            formatCalendar('two'),
            'should emit second cal'
          );
        });
      });

      query.sax.emit('DAV:/response', caldavEventFactory());
      query.sax.emit('DAV:/response', caldavEventFactory());
    });

  });

  suite('#findCalendars', function() {
    var results;
    var given = { url: 'foo', domain: 'google' };
    var calledWith;

    setup(function() {
      subject._requestCalendars = function() {
        calledWith = arguments;
        return {
          send: function() {
            var cb = arguments[arguments.length - 1];
            setTimeout(function() {
              cb(null, { calendar: results });
            }, 0);
          }
        };
      };
    });

    test('success', function(done) {
      results = {
        '/one': calendarFactory({ name: 'one' }),
        '/two': calendarFactory({ name: 'two' })
      };

      subject.findCalendars(given, function(err, data) {
        if (err) {
          done(err);
          return;
        }

        done(function() {
          assert.equal(
            calledWith[0].domain,
            given.domain
          );

          assert.instanceOf(calledWith[0], Caldav.Connection);
          assert.equal(calledWith[1], given.url);

          assert.deepEqual(
            data['/one'],
            subject._formatCalendar(results['/one']),
            'should format and include /one calendar'
          );

          assert.deepEqual(
            data['/two'],
            subject._formatCalendar(results['/two']),
            'should format and include /two calendar'
          );
        });
      });
    });

  });

});
