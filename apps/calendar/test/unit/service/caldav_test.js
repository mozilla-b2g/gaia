/*global Factory */

require('/shared/js/uuid.js');
requireApp('calendar/test/unit/service/helper.js');
requireLib('presets.js');
requireLib('ext/ical.js');
requireLib('ext/caldav.js');
requireLib('service/ical_recur_expansion.js');
requireLib('service/caldav.js');

suite('service/caldav', function() {
  'use strict';

  var subject;
  var con;
  var service;

  var Resource;
  var Finder;

  var fixtures;

  // setup fixtures...
  suiteSetup(function(done) {
    ServiceSupport.setExpansionLimit(100);

    fixtures = new ServiceSupport.Fixtures('ical');
    fixtures.load('minutely_recurring');
    fixtures.load('single_event');
    fixtures.load('recurring_event');
    fixtures.load('recurring_exception');
    fixtures.onready = done;
  });

  suiteTeardown(function() {
    ServiceSupport.resetExpansionLimit();
  });

  function caldavEventFactory(syncToken, name, status) {
    var ical = fixtures[name || 'singleEvent'];

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
  }

  var icalEvent;

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
      mozSystem: true,
      mozAnon: true,
      useMozChunkedText: true
    };

    assert.deepEqual(xhr.prototype.globalXhrOptions, expected);
  });

  test('event routing', function() {
    var events = [
      'getAccount',
      'findCalendars',
      'getCalendar'
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

  suite('#_createConnection', function() {
    test('with oauth present', function() {
      var account = Factory.build('account', {
        preset: 'google'
      });

      var connection = subject._createConnection(account);
      assert.equal(
        connection.httpHandler,
        Caldav.Http.OAuth2,
        'google uses oauth'
      );
    });

    test('without oauth preset', function() {
      var account = Factory.build('account', {
        preset: 'caldav'
      });

      var connection = subject._createConnection(account);
      assert.equal(
        connection.httpHandler,
        Caldav.Http.BasicAuth,
        'default authentication is basic auth'
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
    var dateString = new ICAL.Time();
    dateString.fromUnixTime(options.startDate.valueOf() / 1000);
    assert.include(filter.toString(), dateString.toICALString());

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
    var cal = Factory.build('caldav.calendar');
    var result = subject._formatCalendar(cal);

    assert.equal(result.id, cal.url);
    assert.equal(result.url, cal.url);
    assert.equal(result.name, cal.name);
    assert.equal(result.syncToken, cal.ctag);
    assert.equal(result.description, cal.description);
    assert.equal(result.color, cal.color);
    assert.ok(cal.privilegeSet, 'has privilegeSet');
    assert.equal(result.privilegeSet, cal.privilegeSet);
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
          alarms: [
            // From duration
            { action: 'DISPLAY', trigger: -1800 },
            // From absolute time
            { action: 'DISPLAY', trigger: 22095000 }
          ],
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
          end: subject.formatICALTime(event.endDate)
        };

        assert.deepEqual(
          subject._formatEvent(etag, url, fixtures.singleEvent, event),
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
        var result = subject._formatEvent(
          etag, url, fixtures.recurringEvent, event
        );

        assert.ok(!result.recurrenceId);
        assert.length(result.exceptions, 2);

        var key;
        var exceptions = result.exceptions;

        /*jshint loopfunc:true */
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

              assert.ok(
                !item.icalComponent,
                'exceptions dont resend component'
              );

              assert.deepEqual(
                subject._formatEvent(
                  etag, url,
                  fixtures.recurringEvent, instance
                ),
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

  suite('#adjustAbsoluteAlarms', function() {
    parseFixture('singleEvent');

    var component;
    var relativeAlarm;
    var absoluteAlarm;
    var absoluteTriggerTime;

    setup(function() {
      component = icalEvent.component;

      // remove all previous subcomponents
      component.removeAllSubcomponents('valarm');

      // create a relative alarm
      relativeAlarm = new ICAL.Component('valarm');
      // 5 minutes before
      relativeAlarm.addPropertyWithValue('trigger', '-PT5M');
      relativeAlarm.addPropertyWithValue('action', 'EMAIL');

      absoluteAlarm = new ICAL.Component('valarm');

      absoluteTriggerTime = icalEvent.startDate.clone();
      absoluteTriggerTime.day -= 1;

      absoluteAlarm.addPropertyWithValue(
        'trigger',
        absoluteTriggerTime
      );

      component.addSubcomponent(relativeAlarm);
      component.addSubcomponent(absoluteAlarm);
    });

    test('changes alarm times', function() {
      var originalDate = icalEvent.startDate.clone();
      var newDate = icalEvent.startDate;

      newDate.timezone = ICAL.Timezone.localTimezone;
      newDate.isDate = true;
      newDate.day += 10;

      var expectedDuration = absoluteAlarm.getFirstPropertyValue('trigger').
          subtractDate(originalDate);

      subject.adjustAbsoluteAlarms(originalDate, icalEvent);

      // sanity check
      assert.equal(
        relativeAlarm.getFirstPropertyValue('trigger'),
        '-PT5M',
        'relative times should be unchanged'
      );

      // should be same as original alarm timezone
      var expectedDate = newDate.clone();
      expectedDate.isDate = false;
      expectedDate.timezone = originalDate.timezone;
      expectedDate.day -= 1;

      assert.equal(
        absoluteAlarm.getFirstPropertyValue('trigger').toString(),
        expectedDuration.toString()
      );
    });
  });

  suite('#_displayAlarms', function() {
    suite('multiple instances of alarms', function() {
      // 5 minutes prior
      parseFixture('recurringEvent');


      test('relative alarms', function() {
        var iter = icalEvent.iterator();
        var i = 0;
        var len = 5;

        for (; i < len; i++) {
          var next = iter.next();
          var detail = icalEvent.getOccurrenceDetails(
            next
          );

          var alarm = subject._displayAlarms(detail);
          assert.length(alarm, 1, 'has alarms');

          var start = detail.startDate.clone();
          start.adjust(0, 0, -5, 0);

          assert.equal(
            alarm[0].trigger,
            start.subtractDate(detail.startDate).toSeconds()
          );
        }
      });
    });

    suite('recurring events /w exception', function() {
      parseFixture('recurringException');

      test('parse busytime start, not event start', function() {
        var iter = icalEvent.iterator();
        var i = 0;
        var len = 5;

        var numTested = 0;

        /*jshint loopfunc:true */
        for (; i < len; i++) {
          var next = iter.next();
          var detail = icalEvent.getOccurrenceDetails(
            next
          );

          var allTriggers = [];
          var alarms = null;

          if (detail.startDate.toString() !==
            detail.item.startDate.toString()) {

            alarms = detail.item.component.getAllSubcomponents('valarm');
            alarms.forEach(function(instance) {
              var action = instance.getFirstPropertyValue('action');
              if (action && action === 'DISPLAY') {
                var triggers = instance.getAllProperties('trigger');
                var i = 0;
                var len = triggers.length;

                for (; i < len; i++) {

                  var trigger = triggers[i];
                  if (trigger.type == 'date-time') {
                    numTested++;
                  }

                  allTriggers.push(trigger);
                }
              }
            });
          }
          alarms = subject._displayAlarms(detail);

          allTriggers.forEach(function(trigger, i) {
            assert.equal(
              alarms[i].trigger,
              subject._formatTrigger(trigger, detail.item.startDate)
            );
          });
        }

        assert.equal(numTested, 3);
      });
    });

    suite('display alarms', function() {
      // 30 minutes prior
      parseFixture('singleEvent');

      test('alarms', function() {
        var iter = icalEvent.iterator();
        var next = iter.next();
        var details = icalEvent.getOccurrenceDetails(next);

        var alarms = subject._displayAlarms(details);
        assert.length(alarms, 2);

        var date = icalEvent.startDate.clone();
        date.adjust(0, 0, -30, 0);

        assert.deepEqual(
          alarms[0].trigger,
          date.subtractDate(icalEvent.startDate).toSeconds()
        );
      });
    });
  });

  test('#getAccount', function(done) {
    var calledWith;
    var given = Factory('caldav.account');
    var oauth = { x: true };
    var result = {
      url: '/myfoobar/'
    };

    subject._requestHome = function(connection, url) {
      connection.oauth = oauth;
      connection.user = 'newuser';
      calledWith = arguments;
      return {
        send: function(callback) {
          setTimeout(function() {
            callback(null, result);
          }, 0);
        }
      };
    };

    subject.getAccount(given, function(err, data) {
      done(function() {
        assert.ok(!err, 'should succeed');
        assert.equal(data.calendarHome, result.url);
        assert.equal(data.oauth, calledWith[0].oauth);
        assert.equal(data.user, calledWith[0].user);

        assert.instanceOf(calledWith[0], Caldav.Connection);
        assert.equal(calledWith[0].domain, given.domain);
        assert.equal(calledWith[1], given.entrypoint);
      });
    });
  });

  suite('#_formatTrigger', function(_formatTrigger) {

    parseFixture('singleEvent');

    test('duration type', function() {
      var alarm = icalEvent.component.getAllSubcomponents('valarm')[0];
      var trigger = alarm.getFirstProperty('trigger');

      var start = icalEvent.startDate.clone();
      start.adjust(0, 0, -30, 0);

      var result = subject._formatTrigger(trigger, icalEvent.startDate);

      assert.ok(typeof(result) === 'number');
      assert.equal(trigger.type, 'duration');
      assert.equal(
        result,
        start.subtractDate(icalEvent.startDate).toSeconds()
      );
    });

    test('date-time type', function() {
      var alarm = icalEvent.component.getAllSubcomponents('valarm')[2];
      var trigger = alarm.getFirstProperty('trigger');

      // Adjust our expected date to be the same as what's in single_event.ics
      var start = icalEvent.startDate.clone();
      start.adjust(255, 17, 30, 0);

      var result = subject._formatTrigger(trigger, icalEvent.startDate);

      assert.ok(typeof(result) === 'number');
      assert.equal(trigger.type, 'date-time');
      assert.equal(
        result,
        start.subtractDate(icalEvent.startDate).toSeconds()
      );
    });
  });

  test('#_defaultMaxDate', function() {
    assert.instanceOf(subject._defaultMaxDate().toJSDate(), Date);
  });

  suite('#_handleCaldavEvent', function() {
    var stream;
    var events = [];
    var occurrences = [];
    var components = [];
    var expandCalls;

    setup(function() {
      expandCalls = null;
      occurrences.length = 0;
      events.length = 0;
      components.length = 0;

      stream = new Calendar.Responder();

      stream.on('component', function(item) {
        components.push(item);
      });

      stream.on('event', function(item) {
        events.push(item);
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
            assert.length(occurrences, 1);
            assert.length(events, 1);
            var formatted = subject._formatEvent(
              'abcd', url,
              fixtures.singleEvent,
              icalEvent
            );

            assert.length(components, 1);

            assert.deepEqual(events, [formatted]);
            assert.deepEqual(
              components[0],
              {
                eventId: events[0].id,
                isRecurring: false,
                ical: fixtures.singleEvent
              }
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
          var formatted = subject._formatEvent(
            'abc', url, fixtures.recurringEvent, icalEvent
          );

          done(function() {
            assert.deepEqual(
              events,
              [formatted],
              'events'
            );

            var expandOptions = expandCalls[1];

            assert.deepEqual(
              expandOptions.maxDate.toJSDate(),
              subject._defaultMaxDate().toJSDate(),
              'expand options max date'
            );

            occurrences.forEach(function(item) {
              assert.equal(item.eventId, icalEvent.uid);
            });

            var lastOccurence = occurrences[occurrences.length - 1];

            assert.length(components, 1, 'has component');

            assert.hasProperties(
              components[0],
              {
                eventId: events[0].id,
                ical: fixtures.recurringEvent,
                lastRecurrenceId: lastOccurence.recurrenceId
              }
            );

            assert.ok(components[0].iterator, 'has iterator');

            var iter = new ICAL.RecurExpansion(
              components[0].iterator
            );

            assert.deepEqual(
              components[0].lastRecurrenceId,
              subject.formatICALTime(iter.last),
              'sends viable ical iterator'
            );
          });
        });
      });
    });
  });

  suite('#expandComponents', function() {
    var components;
    var maxDate;
    var max = 15;
    var events;
    var stream;

    setup(function(done) {
      // stream interface to capture events
      stream = new Calendar.Responder();

      // list of sent components
      components = {};

      // stream events
      events = {
        component: [],
        occurrence: {}
      };

      // capture events
      stream.on('component', function(item) {
        events.component.push(item);
      });

      stream.on('occurrence', function(item) {
        var id = item.eventId;
        if (!(id in events.occurrence)) {
          events.occurrence[id] = [];
        }

        events.occurrence[id].push(item);
      });

      subject.parseEvent(fixtures.recurringEvent, function(err, event) {
        var iter = event.iterator();
        var last = null;
        var i = 0;

        while (i++ < max) {
          last = iter.next();
        }

        maxDate = subject.formatICALTime(last);
        done();
      });
    });

    function stage(eventId, expansions=5, skip=0) {
      setup(function(done) {
        if (expansions + skip > max) {
          done(new Error('staging event beyond maximum'));
        }

        subject.parseEvent(fixtures.recurringEvent, function(err, event) {
          var iter = event.iterator();
          var last;

          while (expansions--) {
            last = iter.next();
          }


          // we need to change the id of the event here
          // otherwise we will not be able to track the differences...
          var vcalendar = event.component.parent;
          var events = vcalendar.getAllSubcomponents('vevent');

          // update all events and exceptions to have the new id.
          events.forEach(function(comp) {
            comp.updatePropertyWithValue('uid', eventId);
          });

          var result = Factory('icalComponent', {
            ical: vcalendar.toString(),
            // components always have calendar id prefixes
            eventId: 'prefix-' + eventId,
            lastRecurrenceId: subject.formatICALTime(last),
            iterator: iter.toJSON()
          });

          components[eventId] = result;
          done();
        });
      });
    }

    stage('fiveEvents', 5, 10);
    stage('twoEvents', 13, 2);

    setup(function(done) {
      var list = [];
      // build list for request
      for (var key in components) {
        list.push(components[key]);
      }

      var options = {
        // limit the operations so test
        // is reasonably fast...
        maxDate: maxDate
      };

      stream.onerror = function(err) {
        done(err);
      };

      subject.expandComponents(list, options, stream, done);
    });

    test('all sent events', function() {
      var expectedKeys = Object.keys(components);

      assert.length(
        events.component,
        expectedKeys.length,
        'returns same number of components sent'
      );

      // map all componetns by eventId
      var gotComponents = {};
      events.component.forEach(function(item) {
        gotComponents[item.eventId] = item;
      });

      expectedKeys.forEach(function(eventId) {
        var original = components[eventId];
        var newComp = gotComponents[eventId];

        // verify each component has increased lastRecurrenceId
        // and has the same ical body.
        assert.ok(newComp, 'sends "' + eventId + '"');

        assert.notEqual(
          newComp.eventId,
          original.eventId,
          'does not return prefixed eventId'
        );

        assert.equal(
          newComp.ical,
          original.ical,
          'sends ical body'
        );

        assert.ok(
          newComp.lastRecurrenceId.utc > original.lastRecurrenceId.utc,
          'recurrence id has increased'
        );
      });

      var eventId;
      var occurrences = events.occurrence;

      assert.deepEqual(
        Object.keys(occurrences),
        Object.keys(components),
        'sends occurrences for all components'
      );

      for (eventId in occurrences) {
        var occurrence = occurrences[eventId];
        var len = occurrence.length;

        var min = occurrence[0].recurrenceId.utc;
        var max = occurrence[len - 1].recurrenceId.utc;

        assert.ok(
          min > components[eventId].lastRecurrenceId.utc,
          'first occurrence is after min'
        );

        assert.ok(
          max === maxDate.utc,
          'expands up to minimum date'
        );
      }
    });

  });

  suite('#streamEvents', function() {
    var query;
    var givenAcc;
    var givenCal;
    var calledHandle = [];
    var calledWith;

    var errResult;

    setup(function() {
      errResult = null;
      calledHandle.length = 0;
      var realRequest = subject._requestEvents;
      givenCal = Factory('caldav.calendar');
      givenAcc = Factory('caldav.account');

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
            cb(errResult);
          }, 0);
        };

        // return real query
        return query;
      };
    });

    test('authentication error', function(done) {
      var stream = new Calendar.Responder();
      var options = {
        startDate: new Date(2012, 0, 1),
        cached: {
          'two/': { id: '2', syncToken: 'two' }
        }
      };

      // will be sent in the callback
      errResult = new Error();

      stream.on(
        'missingEvents',
        done.bind(this, new Error('must not emit events'))
      );

      function handler(err) {
        done(function() {
          assert.equal(err, errResult, 'sends error');
        });
      }

      subject.streamEvents(
        givenAcc,
        givenCal,
        options,
        stream,
        handler
      );
    });

    test('empty response', function(done) {
      var stream = new Calendar.Responder();
      var options = {
        startDate: new Date(2012, 0, 1),
        cached: {}
      };

      // should not crash on empty responses...
      subject.streamEvents(givenAcc, givenCal, options, stream, done);
      query.sax.emit('DAV:/response', 'one/', {});
    });

    test('success', function(done) {
      var stream = new Calendar.Responder();
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

      stream.on('missingEvents', function(data) {
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

    test('date', function() {
      var time = new ICAL.Time({
        year: 2012,
        month: 1,
        day: 15,
        isDate: true
      });

      var out = subject.formatICALTime(time);
      assert.isTrue(out.isDate, 'is date');
    });

    test('floating time', function() {
      var time = new ICAL.Time({
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

    test('isDate', function() {
      var date = new Date(2012, 1, 1);
      var transport = Calendar.Calc.dateToTransport(
        date, null, true
      );

      var result = subject.formatInputTime(transport);
      assert.isTrue(result.isDate, 'is date');

      assert.deepEqual(result.toJSDate(), date);
    });

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
        assert.instanceOf(err, Error);
        done();
      });
    });

    test('single', function(done) {
      var expectedComponent = ICAL.parse(fixtures.singleEvent)[1];
      var comp = new ICAL.Component(expectedComponent);
      var timezone = comp.getFirstSubcomponent('vtimezone');
      var tzid = timezone.getFirstPropertyValue('tzid');

      subject.parseEvent(fixtures.singleEvent, function(err, event) {
        done(function() {
          assert.ok(ICAL.TimezoneService.has(tzid), 'has timezone ' + tzid);

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
      now = new ICAL.Time({
        year: 2012,
        month: 1,
        day: 1
      });
    });


    suite('with exceptions', function() {
      parseFixture('recurringEvent');

      teardown(function() {
        Calendar.Service.IcalRecurExpansion.forEachLimit =
          100;
      });

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

        Calendar.Service.IcalRecurExpansion.forEachLimit =
          expected.length;

        var actual = [];
        var stream = new Calendar.Responder();
        var options = {
          iterator: firstIter.toJSON(),
          now: now
        };

        stream.on('occurrence', function(item) {
          actual.push(item);
        });

        var json = icalEvent.component.parent.toJSON();
        subject.expandRecurringEvent(json, options, stream,
                                     function(err, savedIter, last) {
          if (err) {
            done(err);
            return;
          }

          assert.deepEqual(actual, expected, 'expected occurrences');

          assert.deepEqual(
            last,
            expected[expected.length - 1].recurrenceId,
            'sends last iteration'
          );

          assert.deepEqual(
            savedIter,
            iter.toJSON(),
            'saved iterator'
          );

          done();
        });
      });

      test('without existing iterator', function(done) {
        var maxWindow = new ICAL.Time({
          year: 2013,
          month: 1,
          day: 15
        });

        var [iter, expected] = occurrencesUntil(10, maxWindow);

        var actual = [];
        var stream = new Calendar.Responder();
        var options = {
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

          assert.length(actual, expected.length);
          assert.deepEqual(actual, expected, 'expected occurrences');

          assert.deepEqual(
            savedIter,
            iter.toJSON(),
            'saved iterator'
          );

          done();
        });
      });

      test('with (min|max)Date', function(done) {
        var actual = [];
        var occurrences = occurrencesUntil(10)[1];
        var min = occurrences[2].recurrenceId;
        var max = occurrences[5].recurrenceId;

        min = JSON.parse(JSON.stringify(min));
        min.utc -= 1;

        var expected = occurrences.slice(2, 6);
        var stream = new Calendar.Responder();

        stream.on('occurrence', function(item) {
          actual.push(item);
        });

        var options = {
          minDate: min,
          maxDate: max,
          now: now
        };

        var json = icalEvent.component.parent.toJSON();
        subject.expandRecurringEvent(json, options, stream,
                                     function(err, savedIter) {
          if (err) {
            done(err);
            return;
          }

          assert.length(actual, expected.length);
          assert.deepEqual(actual, expected, 'expected occurrences');

          done();
        });

      });

    });
  });

  suite('#findCalendars', function() {
    var results;
    var calledWith;
    var given;

    setup(function() {
      given = Factory('caldav.account');
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
        '/one': Factory.build(
          'caldav.calendar', { name: 'one' }
        ),

        '/two': Factory.build(
          'caldav.calendar', { name: 'one' }
        ),

        '/three': Factory.build(
          'caldav.calendar', { name: 'no read', privilegeSet: ['foo'] }
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
          assert.equal(calledWith[1], given.calendarHome);

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

          assert.ok(
            !data['/three'],
            'skips calendars without read privleges'
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

    suite('#addAlarms', function() {
      test('standard', function(done) {
        var ops = 2;

        subject.addAlarms({
          addSubcomponent: function(result) {
            assert.instanceOf(result, ICAL.Component);
            assert.instanceOf(
              result.getFirstPropertyValue('trigger'),
              ICAL.Duration
            );
            assert.equal(result.getFirstPropertyValue('action'), 'DISPLAY');

            if (!(--ops)) {
              done();
            }
          }
        }, [
          {action: 'DISPLAY', trigger: '60'},
          {action: 'DISPLAY', trigger: '600'}
        ]);
      });

      test('yahoo - mirrored email', function(done) {
        var ops = 4;
        var componentCount = {
          DISPLAY: 0,
          EMAIL: 0
        };

        subject.addAlarms({
          addSubcomponent: function(result) {
            assert.instanceOf(result, ICAL.Component);
            assert.instanceOf(
              result.getFirstPropertyValue('trigger'),
              ICAL.Duration
            );
            componentCount[result.getFirstPropertyValue('action')]++;

            if (!(--ops)) {
              assert.equal(componentCount.DISPLAY, 2);
              assert.equal(componentCount.EMAIL, 2);
              done();
            }
          }
        }, [
          {action: 'DISPLAY', trigger: '60'},
          {action: 'DISPLAY', trigger: '600'}
        ],
        {
          user: 'bob',
          domain: 'https://caldav.calendar.yahoo.com'
        });
      });
    });

    suite('#createEvent', function(done) {
      var event;
      var start = new Date(2012, 1, 1);
      var end = new Date(2012, 1, 2);
      var result;
      var errResult;
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
            errResult = err;
            done();
          }
        );
      });

      test('server request', function(done) {
        subject.parseEvent(putCall[1], function(err, icalEvent) {
          done(function() {
            var vcalendar = icalEvent.component.parent;

            assert.equal(
              vcalendar.getFirstPropertyValue('prodid'),
              subject.icalProductId,
              'has product id'
            );

            assert.equal(
              vcalendar.getFirstPropertyValue('version'),
              subject.icalVersion,
              'has version'
            );

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
          result.icalComponent.trim(),
          ICAL.stringify(ICAL.parse(putCall[1])).trim(),
          'ical'
        );
      });

    });

    suite('#updateEvent', function() {
      var original;
      var raw;

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
            end: Calendar.Calc.dateToTransport(end),
            alarms: [
              { action: 'DISPLAY', trigger: 5000 },
              { action: 'DISPLAY', trigger: 30000 }
            ]
          }
        });

        update = update.remote;

        var eventDetails = {
          event: update,
          icalComponent: fixtures.singleEvent
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
              var vcalendar = newEvent.component.parent;

              assert.ok(!parseErr, parseErr);
              assert.ok(
                typeof(result.icalComponent) === 'string',
                'updated result is returned as a string'
              );

              assert.equal(
                vcalendar.getFirstPropertyValue('prodid'),
                subject.icalProductId,
                'update the prodid'
              );

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

              var alarms = newEvent.component.getAllSubcomponents('valarm');
              assert.equal(alarms.length, 3, 'email alarm intact');

              // The 'DISPLAY' alarms should have a 35000 total
              var total = 0;
              alarms.forEach(function(alarm) {
                var action = alarm.getFirstPropertyValue('action');
                if (action === 'DISPLAY') {
                  var duration = new ICAL.Duration(
                    alarm.getFirstPropertyValue('trigger')
                  );
                  total += duration.toSeconds();
                }
              });
              assert.equal(total, 35000, 'display alarms changed');
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
          // we will re-implement this correctly when
          // we have real queues
          //etag: event.syncToken
        });

        cb();
      });

      subject.deleteEvent(account, calendar, event, function() {
        done();
      });

    });

  });

});
