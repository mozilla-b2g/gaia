define(function(require) {
'use strict';

var CurrentTime = require('views/current_time');

suite('Views.CurrentTime', function() {
  var app;
  var subject;
  var container;
  var timespan;

  suiteSetup(function() {
    app = testSupport.calendar.app();
  });

  setup(function() {
    var startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    var endOfDay = new Date();
    endOfDay.setHours(24, 0, 0, 0);

    // mocks the Calendar.TimeSpan API needed by CurrentTime
    timespan = {
      start: startOfDay,
      end: endOfDay
    };
    timespan.contains = timespan.containsNumeric = function(date) {
      return date >= timespan.start && date <= timespan.end;
    };

    container = {
      'appendChild': sinon.spy(),
      'removeChild': sinon.spy()
    };

    subject = new CurrentTime({ container: container, timespan: timespan });
  });

  suite('#_create', function() {
    setup(function() {
      subject._create();
    });

    test('create and append element to DOM', function() {
      assert.ok(subject.element, 'element');
      assert.include(
        subject.element.className,
        'current-time',
        'className'
      );
      assert.equal(subject.element.getAttribute('aria-hidden'), 'true');
      assert.ok(
        container.appendChild.calledWithExactly(subject.element),
        'append to DOM'
      );
    });
  });

  suite('#activate', function() {
    var contains;

    setup(function() {
      contains = sinon.stub(timespan, 'containsNumeric');
      sinon.stub(subject, '_create');
      sinon.stub(subject, '_tick');
      sinon.stub(subject, '_maybeActivateInTheFuture');
      subject.element = {
        classList: {
          add: sinon.stub()
        }
      };
    });

    teardown(function() {
      contains.restore();
      subject._create.restore();
      subject._tick.restore();
      subject._maybeActivateInTheFuture.restore();
      delete subject.element;
    });

    test('create and setup tick if date is inside timespan', function() {
      contains.returns(true);
      subject.activate();

      assert.ok(
        timespan.containsNumeric.calledOnce,
        'timespan.containsNumeric'
      );
      assert.ok(
        !subject._maybeActivateInTheFuture.called,
        '_maybeActivateInTheFuture'
      );
      assert.ok(
        subject._create.calledOnce,
        '_create'
      );
      assert.ok(
        subject._tick.calledOnce,
        '_tick'
      );
      assert.ok(
        subject.element.classList.add.calledWithExactly('active'),
        'add active class'
      );
    });

    test('call _maybeActivateInTheFuture if outside timespan', function() {
      contains.returns(false);
      subject.activate();
      assert.ok(
        subject._maybeActivateInTheFuture.calledOnce
      );
    });
  });

  suite('#_maybeActivateInTheFuture', function() {
    var clock;
    var start;
    var offset = 24 * 60 * 60 * 1000;

    setup(function() {
      clock = sinon.useFakeTimers();
      start = timespan.start;
      timespan.start = Date.now() + offset;
      sinon.stub(subject, 'activate');
      sinon.stub(subject, '_clearInterval');
    });

    teardown(function() {
      timespan.start = start;
      subject.activate.restore();
      subject._clearInterval.restore();
      clock.restore();
    });

    test('call activate after timeout', function() {
      subject._maybeActivateInTheFuture();
      assert.ok(
        !subject.activate.called,
        'only call activate after timeout'
      );
      assert.ok(
        subject._clearInterval.calledOnce,
        'clear previous timeout'
      );
      clock.tick(offset);
      assert.ok(
        subject.activate.calledOnce,
        'call activate after timeout'
      );
    });
  });

  suite('#_render', function() {
    var clock;
    var date;
    var element;

    setup(function() {
      date = new Date(2014, 4, 22, 5, 15);
      clock = sinon.useFakeTimers(+date);
      element = subject.element;
      sinon.stub(subject, '_checkOverlap');
      subject.element = {
        textContent: null,
        style: {
          top: null
        },
        dataset: {
          date: null,
          l10nDateFormat: null
        }
      };
    });

    teardown(function() {
      clock.restore();
      subject.element = element;
      subject._checkOverlap.restore();
    });

    test('should update position and time', function() {
      subject._render();
      assert.equal(subject.element.id, 'current-time-indicator');
      assert.deepEqual(
        subject.element,
        {
          textContent: '05:15',
          style: {
            top: '21.875%'
          },
          id: 'current-time-indicator',
          dataset: {
            date: date,
            l10nDateFormat: 'current-time24'
          }
        }
      );
      assert.ok(
        subject._checkOverlap.calledOnce,
        'call _checkOverlap once'
      );
      assert.ok(
        subject._checkOverlap.calledWithExactly(5),
        'call _checkOverlap with current hour'
      );
    });
  });

  suite('#_tick', function() {
    var clock;

    setup(function() {
      sinon.stub(subject, '_render');
      sinon.stub(subject, '_clearInterval');
      sinon.stub(subject, 'deactivate');
      sinon.spy(subject, '_tick');
      sinon.stub(timespan, 'contains');
      clock = sinon.useFakeTimers();
    });

    teardown(function() {
      subject._render.restore();
      subject._clearInterval.restore();
      subject.deactivate.restore();
      subject._tick.restore();
      timespan.contains.restore();
      clock.restore();
    });

    test('inside range', function() {
      timespan.contains.returns(true);
      subject._tick();
      assert.ok(
        subject._clearInterval.calledOnce,
        '_clearInterval'
      );
      assert.ok(
        !subject.deactivate.called,
        'deactivate'
      );
      assert.ok(
        subject._render.calledOnce,
        '_render'
      );

      // should call tick every minute
      assert.ok(
        subject._tick.calledOnce,
        '_tick #1'
      );
      clock.tick(60000);
      assert.ok(
        subject._tick.calledTwice,
        '_tick #2'
      );
      clock.tick(60000);
      assert.ok(
        subject._tick.calledThrice,
        '_tick #3'
      );
    });

    test('outside range', function() {
      timespan.contains.returns(false);
      subject._tick();

      assert.ok(
        subject._clearInterval.calledOnce,
        '_clearInterval'
      );
      assert.ok(
        subject.deactivate.calledOnce,
        'deactivate'
      );
      assert.ok(
        !subject._render.called,
        '_render'
      );

      // should not call tick multiple times
      assert.ok(
        subject._tick.calledOnce,
        '_tick #1'
      );
      clock.tick(60000);
      assert.ok(
        subject._tick.calledOnce,
        '_tick #2'
      );
      clock.tick(60000);
      assert.ok(
        subject._tick.calledOnce,
        '_tick #3'
      );
    });
  });

  suite('#_checkOverlap', function() {
    var hour2;

    function HourElement(top, right, left, bottom) {
      this.getBoundingClientRect = function() {
        return {
          top: top,
          right: right,
          left: left,
          bottom: bottom
        };
      };
      this.classList = {
        toggle: sinon.spy(),
        remove: sinon.spy()
      };
    }

    setup(function() {
      hour2 = new HourElement(40, 50, 10, 60);

      subject._container = {
        querySelector: sinon.stub()
          .withArgs('.hour-2 .display-hour')
          .returns(hour2)
      };
    });

    teardown(function() {
      subject._container = container;
      delete subject.element;
    });

    suite('> overlaps', function() {
      setup(function() {
        subject.element = {
          getBoundingClientRect: function() {
            return {
              top: 55,
              right: 300,
              left: 0,
              bottom: 65
            };
          }
        };
        subject._previousOverlap = new HourElement(10, 10, 30, 30);
      });

      teardown(function() {
        delete subject.element;
        delete subject._previousOverlap;
      });

      test('hide overlapping hour', function() {
        subject._checkOverlap(2);
        assert.ok(
          hour2.classList.toggle.calledWithExactly('is-hidden', true),
          'should hide second hour'
        );
        assert.strictEqual(
          subject._previousOverlap,
          hour2,
          'update _previousOverlap'
        );
      });
    });

    suite('> doesn\'t overlap', function() {
      setup(function() {
        subject.element = {
          getBoundingClientRect: function() {
            return {
              top: 105,
              right: 300,
              left: 0,
              bottom: 115
            };
          }
        };
        subject._previousOverlap = hour2;
      });

      test('should not hide hour', function() {
        subject._checkOverlap(2);
        assert.ok(
          hour2.classList.toggle.calledWithExactly('is-hidden', false),
          'should not hide second hour'
        );
        assert.ok(
          !hour2.classList.remove.called,
          'should display second hour'
        );
      });
    });
  });

  suite('#deactivate', function() {
    suite('> with element', function() {
      setup(function() {
        sinon.stub(subject, '_clearInterval');
        subject.element = {
          classList: {
            remove: sinon.stub()
          }
        };
      });

      teardown(function() {
        subject._clearInterval.restore();
        delete subject.element;
      });

      test('should clear the interval & remove active class', function() {
        subject.deactivate();
        assert.ok(subject._clearInterval.calledOnce, '_clearInterval');
        assert.ok(
          subject.element.classList.remove.calledWithExactly('active'),
          'remove active class'
        );
      });
    });

    // element is only created after first activate call and we need to ensure
    // deactivate still works even without an element
    suite('> without element', function() {
      setup(function() {
        sinon.stub(subject, '_clearInterval');
      });

      teardown(function() {
        subject._clearInterval.restore();
      });

      test('should clear the interval', function() {
        assert.ok(!subject.element, 'no element');
        subject.deactivate();
        assert.ok(subject._clearInterval.calledOnce, '_clearInterval');
      });
    });
  });

  suite('#destroy', function() {
    var el;

    setup(function() {
      el = subject.element = {
        classList: {
          remove: sinon.stub()
        }
      };
      sinon.stub(subject, 'deactivate');
      subject._previousOverlap = {};
    });

    teardown(function() {
      subject.deactivate.restore();
    });

    test('stop timer, remove element', function() {
      subject.destroy();
      assert.ok(subject.deactivate.calledOnce, 'deactivate');
      assert.ok(container.removeChild.calledWithExactly(el), 'removeChild');
    });
  });
});

});
