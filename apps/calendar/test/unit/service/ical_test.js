requireApp('calendar/test/unit/service/helper.js');
requireLib('presets.js');
requireLib('ext/ical.js');
requireLib('ext/caldav.js');
requireLib('ext/uuid.js');
requireLib('service/ical_recur_expansion.js');
requireLib('service/mixins.js');
requireLib('service/ical.js');
suite('service/ical', function() {

  var subject;
  var service;
  var stream;
  var singleEventCalendarPath;
  var dailyEventCalendarPath;
  var recurringEventCalendarPath;
  var connection;
  var streamCounter;
  var ical;
  var fixturePath;
  var singleEventPath;
  var dailyEventPath;
  var recurringEventPath;

  setup(function() {
    fixturePath = '../../test/unit/fixtures/caldav/ical/';
    singleEventPath = fixturePath + 'single_event.ics';
    dailyEventPath = fixturePath + 'daily_event.ics';
    recurringEventPath = fixturePath + 'recurring_event.ics';
    service = new Calendar.Responder();
    stream = new Calendar.Responder();
    subject = new Calendar.Service.Ical(service);
    singleEventCalendarPath = {
      format: 'ics',
      url: singleEventPath,
      uid: 'dn4vrfmfn5p05roahsopg57h48@google.com',
      noOfEvents: 1
    };
    dailyEventCalendarPath = {
      format: 'ics',
      url: dailyEventPath,
      uid: '623c13c0-6c2b-45d6-a12b-c33ad61c4868',
      noOfEvents: 1
    };
    recurringEventCalendarPath = {
      format: 'ics',
      url: recurringEventPath,
      uid: '623c13c0-6c2b-45d6-a12b-c33ad61c4868',
      noOfEvents: 3
    };
    streamCounter = 0;
    stream.on('event', function() { streamCounter++ });
    // this function is to fetch the calendar ics file from location in test
    // where we don't wnat to use subject.importCalendar().
    connection = function(url, callback) {
      var xhr = new XMLHttpRequest({
        mozSystem: true
      });
      xhr.open('GET', url, true);
      xhr.onload = function() {
        var ical = xhr.responseText;
        callback(null, ical);
      };
      xhr.send();
    };
  });

  test('initalizer', function() {
    assert.equal(subject.service, service);
  });

  test('import empty url', function(done) {
    subject.importCalendar('', stream, function(err) {
      assert.deepEqual(err, new Error('url is empty'));
      done();
    });
  });

  test('importCalendar without recurring events', function(done) {
    stream.on('event', function(event) {
      assert.equal(event.id, singleEventCalendarPath.uid);
    });
    subject.importCalendar(singleEventCalendarPath.url, stream,
      function(err) {
        assert.ok(!err);
        assert.equal(streamCounter, singleEventCalendarPath.noOfEvents);
        done();
      }
    );
  });

  test('importCalendar with daily events', function(done) {
    stream.on('event', function(event) {
      assert.equal(event.id, dailyEventCalendarPath.uid);
    });
    subject.importCalendar(dailyEventCalendarPath.url, stream,
      function(err) {
        assert.ok(!err);
        assert.equal(streamCounter, dailyEventCalendarPath.noOfEvents);
        done();
      }
    );
  });

  test('importCalendar with recurring events', function(done) {
    stream.on('event', function(event) {
      assert.equal(event.id, recurringEventCalendarPath.uid);
    });
    subject.importCalendar(recurringEventCalendarPath.url, stream,
      function(err) {
        assert.ok(!err);
        assert.equal(streamCounter, recurringEventCalendarPath.noOfEvents);
        done();
      }
    );
  });

  test('icalEventParser', function(done) {
    connection(singleEventCalendarPath.url, function(err, response) {
      assert.ok(response);
      stream.on('event', function(event) {
        assert.equal(event.id, singleEventCalendarPath.uid);
      });
      subject.icalEventParser(response, stream, singleEventCalendarPath.url,
        function(err) {
          assert.ok(!err);
          assert.equal(streamCounter, singleEventCalendarPath.noOfEvents);
          done();
        }
      );
    });
  });

  test('parseEventIcal', function(done) {
    subject.parseEventIcal('', function(err, icalparsed) {
      assert.ok(err);
    });
    connection(singleEventCalendarPath.url, function(err, response) {
      subject.parseEvent(response, function(err, event)  {
        assert.ok(event);
        done();
      });
    });
  });
});
