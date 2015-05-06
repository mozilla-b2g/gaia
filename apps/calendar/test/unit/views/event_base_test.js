define(function(require) {
'use strict';

require('/shared/elements/gaia-header/dist/gaia-header.js');
var EventBase = require('views/event_base');
var EventModel = require('models/event');
var View = require('view');
var router = require('router');

suite('Views.EventBase', function() {
  var core;
  var subject;
  var triggerEvent;
  var last = router.last;

  function hasClass(value) {
    return subject.element.classList.contains(value);
  }

  suiteSetup(function() {
    core = testSupport.calendar.core();
    triggerEvent = testSupport.calendar.triggerEvent;
    last = router.last;
  });

  teardown(function() {
    var el = document.getElementById('test');
    el.parentNode.removeChild(el);
    router.last = last;
  });

  setup(function(done) {
    var div = document.createElement('div');
    div.id = 'test';
    div.innerHTML = [
      '<div id="event-test">',
        '<gaia-header id="event-test-header" action="cancel">',
          '<button class="primary">primary</button>',
        '</gaia-header>',
      '</div>'
    ].join('');

    document.body.appendChild(div);

    subject = new EventBase({
      selectors: {
        element: '#event-test',
        header: '#event-test-header',
        primaryButton: '#event-test .primary'
      }
    });

    core.db.open(done);
  });

  // setup this.account / this.calendar
  testSupport.calendar.accountEnvironment();

  // setup this.event / this.busytime
  testSupport.calendar.eventEnvironment();

  teardown(function(done) {
    testSupport.calendar.clearStore(
      core.db,
      ['accounts', 'calendars', 'events', 'busytimes'],
      function() {
        core.db.close();
        done();
      }
    );
  });

  test('initialization', function() {
    assert.instanceOf(subject, View);
    assert.instanceOf(subject, EventBase);

    assert.ok(subject._els, 'has elements');
  });

  test('.primaryButton', function() {
    assert.ok(subject.primaryButton);
  });

  test('.header', function() {
    assert.ok(subject.header);
  });

  test('.fieldRoot', function() {
    assert.ok(subject.fieldRoot);
    assert.equal(subject.fieldRoot, subject.element);
  });

  test('.uiSelector', function() {
    assert.ok(subject.uiSelector);
  });

  suite('#useModel', function() {
    var callsUpdateUI;
    setup(function() {
      callsUpdateUI = false;
      subject._updateUI = function() {
        callsUpdateUI = true;
      };
    });

    test('multiple pending operations', function(done) {
      function throwsError() {
        done(new Error('incorrect callback fired...'));
      }

      subject.useModel(this.busytime, this.event, throwsError);
      subject.useModel(this.busytime, this.event, throwsError);
      subject.useModel(this.busytime, this.event, done);
    });

    test('readonly', function(done) {
      var provider = core.providerFactory.get('Mock');

      provider.stageEventCapabilities(this.event._id, null, {
        canUpdate: false
      });

      subject.useModel(this.busytime, this.event, function() {
        done(function() {
          assert.isTrue(hasClass(subject.READONLY), 'is readonly');
          assert.isTrue(callsUpdateUI, 'updates ui');
        });
      });
    });

    test('normal', function(done) {
      var isDone = false;
      subject.useModel(this.busytime, this.event, function() {
        done(function() {
          assert.ok(isDone, 'not async');
          assert.ok(
            !subject.element.classList.contains(subject.LOADING),
            'is not loading'
          );

          assert.equal(
            subject.originalCalendar._id,
            this.event.calendarId
          );

          assert.isTrue(callsUpdateUI, 'updates ui');
          assert.isFalse(hasClass(subject.READONLY), 'is readonly');
        }.bind(this));
      }.bind(this));

      assert.ok(
        subject.element.classList.contains(subject.LOADING),
        'is loading'
      );
      isDone = true;
    });
  });

  suite('#dispatch', function() {
    var classList;

    setup(function() {
      classList = subject.element.classList;
    });

    suite('create', function() {
      var date = new Date();
      date.setDate(date.getDate() + 1);
      date.setMinutes(0);
      date.setSeconds(0);
      date.setMilliseconds(0);

      var headerFontSize;

      setup(function(done) {
        headerFontSize = this.sinon.stub(subject.header, 'runFontFitSoon');

        core.timeController.move(date);
        subject.dispatch({ params: {} });

        subject.ondispatch = done;
      });

      test('display', function() {
        // Updates the header font size.
        sinon.assert.calledOnce(headerFontSize);

        // class details
        assert.isTrue(classList.contains(subject.CREATE), 'has create class');
        assert.isFalse(
          classList.contains(subject.UPDATE),
          'has update class'
        );

        // model
        assert.instanceOf(
          subject.event,
          EventModel
        );

        // expected model time
        var expectedStart = new Date(date.valueOf());
        var expectedEnd = new Date(expectedStart.valueOf());
        expectedEnd.setHours(expectedStart.getHours() + 1);

        assert.deepEqual(subject.event.startDate, expectedStart);
        assert.deepEqual(subject.event.endDate, expectedEnd);
      });

    });

    test('/add returnTo', function() {
      router.last = {
        path: '/event/add/'
      };

      subject.dispatch({ params: {} });
      assert.equal(subject.returnTo(), subject.DEFAULT_VIEW);
    });

    test('/advanced-settings returnTo', function() {
      router.last = {
        path: '/advanced-settings/'
      };

      subject.dispatch({ params: {} });
      assert.strictEqual(subject.returnTo(), subject.DEFAULT_VIEW);
    });

    test('/day returnTo', function() {
      router.last = {
        path: '/day/'
      };

      subject.dispatch({ params: {} });
      assert.strictEqual(subject.returnTo(), '/day/');
    });

   suite('update', function() {
      setup(function(done) {
        subject.ondispatch = done;
        subject.dispatch({
          params: { id: this.busytime._id }
        });

        assert.ok(
          subject.element.classList.contains(subject.LOADING),
          'is loading'
        );
      });

      test('is done loading', function() {
        assert.ok(
          !subject.element.classList.contains(subject.LOADING)
        );
      });

      test('existing model', function() {
        assert.isFalse(classList.contains(subject.CREATE), 'has create class');
        assert.isTrue(classList.contains(subject.UPDATE), 'has update class');

        assert.deepEqual(
          subject.busytime,
          this.busytime,
          'has correct busytime'
        );

        assert.deepEqual(
          this.event,
          subject.event.data,
          'has correct event'
        );
      });
    });
  });

  test('#returnTop', function(done) {
    assert.ok(subject.returnTop);

    subject._returnTo = '/foo';
    subject._updateUI = function() {
      assert.equal(subject._returnTo, '/foo');
      assert.equal(subject._returnTop, '/foo');
    };

    subject.dispatch({params: {}});

    subject._returnTo = '/bar';
    subject._updateUI = function() {
      assert.equal(subject._returnTo, '/bar');
      assert.equal(subject._returnTop, '/foo');
    };
    subject.dispatch({params: {}});

    subject.returnTop();
    subject._returnTo = '/bar';
    subject._updateUI = function() {
      assert.equal(subject._returnTo, '/bar');
      assert.equal(subject._returnTop, '/bar');
      done();
    };
    subject.dispatch({params: {}});
  });

  suite('#_createModel', function() {

    test('time is less then now', function() {
      var model = subject._createModel(new Date(2012, 0, 1));

      assert.hasProperties(
        model,
        {
          startDate: new Date(2012, 0, 1, 8),
          endDate: new Date(2012, 0, 1, 9)
        }
      );
    });

    test('time is today', function() {
      var now = new Date();
      var start = new Date(now.getTime());
      start.setHours(0, 0, 0, 0);
      // defaults to next hour
      var realStart = new Date(now.getTime());
      realStart.setHours(now.getHours() + 1, 0, 0, 0);
      var end = new Date(now.getTime());
      end.setHours(now.getHours() + 2, 0, 0, 0);

      var model = subject._createModel(start);

      assert.hasProperties(
        model,
        { startDate: realStart, endDate: end }
      );
    });

    test('time is greater then now', function() {
      var now = new Date();
      var year = now.getFullYear() + 1;
      var start = new Date(year, 6, 23);
      var model = subject._createModel(start);

      assert.hasProperties(
        model,
        {
          startDate: new Date(year, 6, 23, 8),
          endDate: new Date(year, 6, 23, 9)
        }
      );
    });
  });
});

});
