requireApp('calendar/test/unit/service/helper.js');
requireLib('presets.js');
requireLib('ext/ical.js');
requireLib('ext/caldav.js');
requireLib('ext/uuid.js');
requireLib('service/ical_recur_expansion.js');
requireLib('service/ical.js');

suite('service/ical', function() {

  var subject;
  var con;
  var service;

  var Resource;
  var Finder;

  var fixtures;

  // setup fixtures...
  suiteSetup(function(done) {
    this.timeout(10000);
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
    subject = new Calendar.Service.Ical(service);
    con = Factory('caldav.connection');
  });

  test('initalizer', function() {
    assert.equal(subject.service, service);
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

        for (; i < len; i++) {
          var next = iter.next();
          var detail = icalEvent.getOccurrenceDetails(
            next
          );

          var allTriggers = [];

          if (detail.startDate.toString() !==
            detail.item.startDate.toString()) {

            var alarms = detail.item.component.getAllSubcomponents('valarm');
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
          var alarms = subject._displayAlarms(detail);

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
        var url = "http://www.webcal.fi/cal.php?id=38&format=ics&wd=-1&wrn=1&label=Week&wp=4&wf=26&color=%23000000&cntr=us&lang=en&rid=wc";
        subject.importFromUrl({},url,stream,function(err,param){});

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
        var [iter, occurrences] = occurrencesUntil(10);

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





    

  });

});
