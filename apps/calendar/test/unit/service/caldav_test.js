requireApp('calendar/test/unit/helper.js', function() {
  requireApp('calendar/test/unit/service/helper.js');
  requireLib('ext/ical.js');
  requireLib('ext/caldav.js');
  requireLib('ext/uuid.js');
  requireLib('service/caldav.js');
});

suite('service/caldav', function() {

  var subject;
  var con;
  var service;

  var Resource;
  var Finder;

  var fixtures;

  // setup fixtures...
  suiteSetup(function(done) {
    this.timeout(10000);
    fixtures = new ServiceSupport.Fixtures('ical');
    fixtures.load('minutely_recurring');
    fixtures.load('single_event');
    fixtures.load('recurring_event');
    fixtures.onready = done;
  });

  function caldavEventFactory(syncToken, name, status) {
    var ical = ICAL.parse(fixtures[name || 'singleEvent']);

    return {
      'getetag': {
        status: status || '200',
        value: syncToken || 'abcd'
      },

      'calendar-data': {
        status: status || '200',
        value: ical
      }
    };
  };

  var icalEvent;
  var icalEvents = {};

  function parseFixture(name) {
    setup(function(done) {
      subject.parseEvent(fixtures[name], function(err, event) {
        icalEvent = event;
        done();
      });
    });
  }

  suiteSetup(function() {
    Resource = Caldav.Resources.Calendar;
    Finder = Caldav.Request.Resources;
  });

  setup(function() {
    service = new Calendar.Responder();
    subject = new Calendar.Service.Caldav(service);
    con = Factory('caldav.connection');
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
      };

      service.emit(event, 1, 2, 3, 4);

      assert.deepEqual(
        calledWith,
        [1, 2, 3, 4],
        'should route event to: ' + event
      );
    });
  });

  test('#_requestEvents', function() {
    var options = {
      startDate: new Date(2012, 0, 1)
    };

    var cal = Factory('caldav.calendar');
    var result = subject._requestEvents(
      con, cal, options
    );

    assert.isTrue(result.hasProp('getetag'));

    // verify that VCALENDAR & VEVENT are included
    var data = result.data;
    var filter = result.filter;

    /// has data
    assert.equal(data.getComp().name, 'VCALENDAR', 'data- calendar');
    assert.include(data.toString(), 'VCALENDAR');

    // filter
    var dateString = new ICAL.icaltime();
    dateString.fromUnixTime(options.startDate.valueOf() / 1000);
    assert.include(filter.toString(), dateString.toString());

    assert.instanceOf(result, Caldav.Request.CalendarQuery);
    assert.equal(result.connection, con);
  });

  test('#_requestCalendars', function() {
    var result = subject._requestCalendars(
      con, con.url
    );

    assert.equal(result.connection, con);
    assert.equal(result.url, con.url);

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
      con, con.url
    );

    assert.equal(result.connection, con);
    assert.equal(result.url, con.url);

    assert.instanceOf(
      result,
      Caldav.Request.CalendarHome
    );
  });

  test('#_formatCalendar', function() {
    var cal = Factory('caldav.calendar');
    var result = subject._formatCalendar(cal);

    assert.equal(result.id, cal.url);
    assert.equal(result.url, cal.url);
    assert.equal(result.name, cal.name);
    assert.equal(result.syncToken, cal.ctag);
    assert.equal(result.description, cal.description);
    assert.equal(result.color, cal.color);
  });

  suite('#_formatEvent', function() {
    var url = '/fooza';
    var etag = 'xx1';

    suite('single event', function() {
      var event;

      setup(function(done) {
        subject.parseEvent(fixtures.singleEvent, function(err, result) {
          event = result;
          done();
        });
      });

      test('output', function() {
        var expected = {
          syncToken: etag,
          url: url,
          id: event.uid,
          exceptions: null,
          recurrenceId: null,
          title: event.summary,
          description: event.description,
          isRecurring: false,
          location: event.location,
          start: subject.formatICALTime(event.startDate),
          end: subject.formatICALTime(event.endDate),
          icalComponent: event.component.parent.toJSON()
        };

        assert.deepEqual(
          subject._formatEvent(etag, url, event),
          expected
        );
      });
    });

    suite('event with exceptions', function() {
      var event;

      setup(function() {
        subject.parseEvent(fixtures.recurringEvent, function(err, result) {
          event = result;
        });
      });

      test('output', function() {
        var result = subject._formatEvent(etag, url, event);
        assert.ok(!result.recurrenceId);
        assert.length(result.exceptions, 2);

        var key;
        var exceptions = result.exceptions;

        for (key in event.exceptions) {
          var found = false;
          var instance = event.exceptions[key];
          var time = subject.formatICALTime(instance.recurrenceId);

          exceptions.forEach(function(item) {
            if (item.recurrenceId.utc === time.utc) {
              found = true;
              assert.equal(
                item.exceptions,
                null,
                'no exception check - exception: ' + key
              );

              assert.deepEqual(
                subject._formatEvent(etag, url, instance, result.icalComponent),
                item,
                'compare exception: ' + key
              );
            }
          });
          assert.ok(found, key + ' exception missing');
        }

      });
    });
  });

  suite('#_displayAlarms', function() {
    suite('multiple instances of alarms', function() {
      // 5 minutes prior
      parseFixture('recurringEvent');


      test('alarms', function() {
        var iter = icalEvent.iterator();
        var i = 0;
        var len = 5;

        for (; i < len; i++) {
          var next = iter.next();
          var detail = icalEvent.getOccurrenceDetails(
            next
          );

          var alarm = subject._displayAlarms(detail);
          assert.length(alarm, 1, 'has alarm');

          var start = detail.startDate.clone();
          start.adjust(0, 0, -5, 0);

          assert.deepEqual(
            alarm[0].startDate,
            subject.formatICALTime(start)
          );
        }
      });
    });

    suite('single display alarm', function() {
      // 30 minutes prior
      parseFixture('singleEvent');

      test('alarms', function() {
        var iter = icalEvent.iterator();
        var next = iter.next();
        var details = icalEvent.getOccurrenceDetails(next);

        var alarms = subject._displayAlarms(details);
        assert.length(alarms, 1);

        var date = icalEvent.startDate;
        date.adjust(0, 0, -30, 0);

        assert.deepEqual(
          alarms[0].startDate,
          subject.formatICALTime(date)
        );
      });
    });
  });

  test('#getAccount', function(done) {
    var calledWith;
    var given = Factory('caldav.account');
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

  test('#_defaultMaxDate', function() {
    assert.instanceOf(subject._defaultMaxDate().toJSDate(), Date);
  });

  suite('#_handleCaldavEvent', function() {
    var stream;
    var events = [];
    var occurrences = [];
    var iterator;
    var iteratorEnds;
    var expandCalls;
    var etag = 'xx1';

    setup(function() {
      expandCalls = null;
      occurrences.length = 0;
      iterator = null;
      iteratorEnds = false;
      events.length = 0;
      stream = new Calendar.Responder();

      stream.on('occurrences end', function() {
        iteratorEnds = true;
      });

      stream.on('event', function(item) {
        events.push(item);
      });

      stream.on('recurring iterator', function(item) {
        iterator = item;
      });

      stream.on('occurrence', function(item) {
        occurrences.push(item);
      });

      var expand = subject.expandRecurringEvent;

      // spy
      subject.expandRecurringEvent = function() {
        expandCalls = arguments;
        expand.apply(this, arguments);
      };

    });

    suite('singleEvent', function() {
      parseFixture('singleEvent');

      test('sent events', function(done) {
        var url = '/foo.ics';
        var response = caldavEventFactory();

        subject._handleCaldavEvent(url, response, stream, function(err) {
          if (err) {
            return done(err);
          }

          done(function() {
            assert.ok(!iterator);
            assert.ok(iteratorEnds);
            assert.length(occurrences, 1);
            assert.length(events, 1);
            assert.deepEqual(
              events,
              [subject._formatEvent('abcd', url, icalEvent)]
            );
          });
        });
      });

    });

    suite('recurringEvent', function() {
      parseFixture('recurringEvent');

      test('sent events', function(done) {
        var url = '/foo.ics';
        var response = caldavEventFactory('abc', 'recurringEvent');

        subject._handleCaldavEvent(url, response, stream, function(err) {
          assert.ok(!err);
          done(function() {
            assert.deepEqual(
              events,
              [subject._formatEvent('abc', url, icalEvent)],
              'events'
            );

            var expandOptions = expandCalls[1];

            assert.equal(
              expandOptions.limit,
              subject._defaultOccurrenceLimit,
              'expand options limit'
            );

            assert.deepEqual(
              expandOptions.maxDate.toJSDate(),
              subject._defaultMaxDate().toJSDate(),
              'expand options max date'
            );

            assert.ok(occurrences.length > 1, 'has occurrences');

            occurrences.forEach(function(item) {
              assert.equal(item.eventId, icalEvent.uid);
            });

            assert.ok(!iterator.complete, 'iterator complete');
            assert.ok(!iteratorEnds, 'end event');
          });
        });
      });
    });
  });

  suite('#streamEvents', function() {
    var query;
    var givenAcc;
    var givenCal;
    var calledHandle = [];
    var calledWith;

    setup(function() {
      calledHandle.length = 0;
      var realRequest = subject._requestEvents;
      var givenCal = Factory('caldav.calendar');
      var givenAcc = Factory('caldav.account');

      subject._handleCaldavEvent = function() {
        var args = Array.prototype.slice.call(arguments);
        calledHandle.push(args);
        args[args.length - 1]();
      };

      // spy on request events
      subject._requestEvents = function() {
        calledWith = arguments;

        // get real query
        query = realRequest.apply(this, arguments);

        // when query is 'sent' fire a callback
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

    test('result', function(done) {
      var stream = new Calendar.Responder();
      var events = [];
      var cals = {
        'one': caldavEventFactory('one'),
        'two': caldavEventFactory('two')
      };

      var options = {
        startDate: new Date(2012, 0, 1),
        cached: {
          'two/': { id: '2', syncToken: 'two' },
          // intentionally has no cals pair this
          // is the item we will send the 'missing events' event for.
          'three/': { id: '3', syncToken: 'three' }
        }
      };

      var expectedMissing = ['3'];
      var missingEvents;

      stream.on('missing events', function(data) {
        missingEvents = data;
      });

      // cb fires in next turn of event loop.
      subject.streamEvents(givenAcc, givenCal, options, stream,
                           function(err, data) {


        done(function() {
          assert.ok(!err);
          assert.ok(!data);
          assert.ok(calledWith, 'calls request');

          assert.equal(
            calledWith[2], options,
            'sends options to request'
          );

          assert.equal(calledHandle.length, 1);

          assert.deepEqual(
            missingEvents, expectedMissing, 'sends missing events'
          );

          assert.deepEqual(
            calledHandle[0][1],
            caldavEventFactory('one'),
            'should emit first cal'
          );
        });
      });

      query.sax.emit('DAV:/response', 'one/', caldavEventFactory('one'));
      query.sax.emit('DAV:/response', 'two/', caldavEventFactory('two'));
    });

  });

  suite('#formatICALTime', function() {

    test('floating time', function() {
      var time = new ICAL.icaltime({
        year: 2012,
        month: 1,
        day: 15,
        hour: 8,
        minute: 30
      });

      var expected = {
        offset: 0,
        tzid: 'floating',
        // convert from seconds to ms
        utc: time.toUnixTime() * 1000
      };

      assert.deepEqual(
        subject.formatICALTime(time),
        expected
      );
    });
  });

  suite('#formatInputTime', function() {
    test('floating time', function() {
      var input = {
        offset: 0,
        utc: Date.UTC(2012, 0, 1, 0),
        tzid: 'floating'
      };

      // This test assumes local TZ
      var expectedDate = new Date(2012, 0, 1, 0);

      var result = subject.formatInputTime(input);
      assert.deepEqual(result.toJSDate(), expectedDate);
    });

    test('PST', function() {

      var input = {
        // -8 hours in milliseconds
        offset: (8 * (60 * (60 * 1000))) * -1,
        // utc is ahead in this case so we add 8 hours
        utc: Date.UTC(2012, 0, 1, 0),
        tzid: 'Los Angeles/America'
      };

      // This test assumes PST TZ
      var expectedDate = new Date('Sun, 01 Jan 2012 00:00:00 PST');

      var result = subject.formatInputTime(input);
      assert.deepEqual(new Date(result.toJSDate()), expectedDate);
    });
  });

  suite('#parseEvent', function() {

    test('error', function(done) {
      subject.parseEvent('BEGIN:VCALENDAR\nFOOOBAR', function(err) {
        assert.instanceOf(err, ICAL.icalparser.Error);
        done();
      });
    });

    test('single', function(done) {
      var expectedComponent = ICAL.parse(fixtures.singleEvent);
      // normalize expected output
      expectedComponent = (new ICAL.icalcomponent(expectedComponent)).toJSON();

      subject.parseEvent(fixtures.singleEvent, function(err, event) {
        done(function() {
          assert.instanceOf(event, ICAL.Event);
          assert.deepEqual(
            event.component.parent.toJSON(),
            expectedComponent
          );
        });
      });
    });

    test('with exceptions', function(done) {
      subject.parseEvent(fixtures.recurringEvent, function(err, event) {
        done(function() {
          assert.instanceOf(event, ICAL.Event);
          var exceptions = Object.keys(event.exceptions);
          assert.length(exceptions, 2);
        });
      });
    });
  });

  suite('#expandRecurringEvent', function() {
    var now;

    setup(function() {
      now = new ICAL.icaltime({
        year: 2012,
        month: 1,
        day: 1
      });
    });

    suite('with exceptions', function() {
      parseFixture('recurringEvent');

      function occurrencesUntil(limit, maxWindow) {
        var occurrences = [];

        var iter = icalEvent.iterator(
          icalEvent.startDate
        );

        var max = limit;
        var inc = 0;
        var next;

        while ((inc++ < max) && (next = iter.next())) {
          var details = icalEvent.getOccurrenceDetails(next);
          occurrences.push({
            start: subject.formatICALTime(details.startDate),
            end: subject.formatICALTime(details.endDate),
            recurrenceId: subject.formatICALTime(details.recurrenceId),
            eventId: details.item.uid,
            isException: details.item.isRecurrenceException(),
            alarms: subject._displayAlarms(details)
          });

          if (maxWindow && next.compare(maxWindow) >= 0) {
            break;
          }
        }

        return [iter, occurrences];
      }

      test('with existing iterator', function(done) {
        var [firstIter] = occurrencesUntil(6);
        var [iter, expected] = occurrencesUntil(10);

        expected.splice(0, 6);

        var max = expected.length;

        var actual = [];
        var stream = new Calendar.Responder();
        var options = {
          limit: max,
          iterator: firstIter.toJSON(),
          now: now
        };

        stream.on('occurrence', function(item) {
          actual.push(item);
        });

        var json = icalEvent.component.parent.toJSON();
        subject.expandRecurringEvent(json, options, stream,
                                     function(err, savedIter) {
          if (err) {
            done(err);
            return;
          }
          assert.deepEqual(actual, expected, 'expected occurrences');

          assert.deepEqual(
            savedIter,
            iter.toJSON(),
            'saved iterator'
          );

          done();
        });
      });

      test('without existing iterator', function(done) {
        var maxWindow = new ICAL.icaltime({
          year: 2013,
          month: 1,
          day: 15
        });

        var [iter, expected] = occurrencesUntil(10, maxWindow);

        var actual = [];
        var stream = new Calendar.Responder();
        var options = {
          limit: 10,
          maxDate: subject.formatICALTime(maxWindow),
          now: now
        };

        stream.on('occurrence', function(item) {
          actual.push(item);
        });

        var json = icalEvent.component.parent.toJSON();
        subject.expandRecurringEvent(json, options, stream,
                                     function(err, savedIter) {
          if (err) {
            done(err);
            return;
          }

          assert.deepEqual(actual, expected, 'expected occurrences');

          assert.deepEqual(
            savedIter,
            iter.toJSON(),
            'saved iterator'
          );

          done();
        });
      });

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
        '/one': Factory(
          'caldav.calendar', { name: 'one' }
        ),

        '/two': Factory(
          'caldav.calendar', { name: 'one' }
        )
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

  suite('asset requests', function() {
    var account;
    var calendar;
    var event;

    var assetReq;

    function mockAsset(method, cb) {
      var realMethod = subject._assetRequest;

      subject._assetRequest = function() {
        assetReq = realMethod.apply(this, arguments);
        assetReq[method] = cb;

        return assetReq;
      };
    }

    function mockXhr() {
      return {
        status: 201,
        getResponseHeader: function(name) {
          return name;
        }
      };
    }

    setup(function() {
      account = Factory('caldav.account');
      calendar = Factory('remote.calendar');
      event = Factory('remote.event', {
        syncToken: 'token',
        url: '/foobar.ics'
      });
    });

    test('#_assetRequest', function() {
      var req = subject._assetRequest(account, event.url);
      assert.instanceOf(req, Caldav.Request.Asset);
    });

    suite('#createEvent', function(done) {
      var event;
      var start = new Date(2012, 1, 1);
      var end = new Date(2012, 1, 2);
      var result;
      var putCall;

      setup(function(done) {
        event = {
          title: 'title',
          description: 'desc',
          location: 'location',
          start: Calendar.Calc.dateToTransport(start),
          end: Calendar.Calc.dateToTransport(end)
        };

        mockAsset('put', function(options, data, cb) {
          putCall = [options, data];
          cb(null, null, mockXhr());
        });

        subject.createEvent(
          account,
          calendar,
          event,
          function(err, remote) {
            result = remote;
            done();
          }
        );
      });

      test('server request', function(done) {
        subject.parseEvent(putCall[1], function(err, icalEvent) {
          done(function() {
            assert.hasProperties(icalEvent, {
              summary: event.title,
              description: event.description,
              location: event.location
            });

            assert.deepEqual(
              Calendar.Calc.dateFromTransport(event.start),
              new Date(icalEvent.startDate.toJSDate()),
              'start'
            );

            assert.deepEqual(
              Calendar.Calc.dateFromTransport(event.end),
              new Date(icalEvent.endDate.toJSDate()),
              'end'
            );
          });
        });
      });

      test('service response', function() {
        assert.equal(result.syncToken, 'Etag', 'etag');
        assert.deepEqual(
          result.icalComponent,
          ICAL.parse(putCall[1]),
          'ical'
        );
      });

    });

    suite('#updateEvent', function() {
      var original;
      var raw;
      var update;

      setup(function(done) {
        raw = fixtures.singleEvent;
        subject.parseEvent(raw, function(err, event) {
          original = event;
          done();
        });

      });

      test('result', function(done) {
        var start = new Date(2012, 0, 1, 0, 0);
        var end = new Date(2012, 0, 5, 0, 0);

        var update = Factory('event', {
          remote: {
            title: 'new title',
            description: 'new desc',
            location: 'new loc',
            start: Calendar.Calc.dateToTransport(start),
            end: Calendar.Calc.dateToTransport(end)
          }
        });

        update = update.remote;

        var eventDetails = {
          event: update,
          icalComponent: ICAL.parse(fixtures.singleEvent)
        };

        mockAsset('put', function() {
          var args = Array.prototype.slice.call(arguments);
          var cb = args.pop();
          cb(null, null, mockXhr());
        });

        subject.updateEvent(account, calendar, eventDetails,
                            function(err, result) {

          subject.parseEvent(result.icalComponent,
                             function(parseErr, newEvent) {

            done(function() {
              assert.ok(!parseErr, parseErr);
              assert.equal(
                newEvent.sequence,
                parseInt(original.sequence, 10) + 1,
                'sequence increment'
              );

              assert.equal(newEvent.summary, update.title);
              assert.equal(newEvent.description, update.description);
              assert.equal(newEvent.location, update.location);

              assert.deepEqual(
                end,
                new Date(newEvent.endDate.toJSDate()),
                'end date'
              );

              assert.deepEqual(
                start,
                new Date(newEvent.startDate.toJSDate()),
                'start date'
              );

              assert.equal(result.syncToken, 'Etag', 'etag');
            });
          });
        });

      });

    });

    test('#deleteEvent', function(done) {
      mockAsset('delete', function(options, cb) {

        assert.equal(assetReq.url, event.url);
        assert.ok(assetReq.connection);
        assert.deepEqual(options, {
          etag: event.syncToken
        });

        cb();
      });

      subject.deleteEvent(account, calendar, event, function() {
        done();
      });

    });

  });

});
