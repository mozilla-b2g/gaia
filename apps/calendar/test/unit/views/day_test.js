requireCommon('test/synthetic_gestures.js');
requireApp('calendar/shared/js/gesture_detector.js');
requireLib('timespan.js');

suiteGroup('Views.Day', function() {
  'use strict';

  var subject,
      app,
      controller,
      triggerEvent;

  suiteSetup(function() {
    triggerEvent = testSupport.calendar.triggerEvent;
  });

  teardown(function() {
    var el = document.getElementById('test');
    el.parentNode.removeChild(el);
  });

  setup(function() {
    var div = document.createElement('div');
    div.id = 'test';
    div.innerHTML = [
      '<div id="day-view">',
      '</div>'
    ].join('');

    document.body.appendChild(div);

    app = testSupport.calendar.app();
    controller = app.timeController;
    controller.move(new Date());

    subject = new Calendar.Views.Day({
      app: app
    });

    // we need to mock the DayChild constructor to avoid problems with the
    // CurrentTime and keep the tests isolated
    subject.childClass = function MockDayChild() {
      this.create = sinon.spy();
      this.activate = sinon.spy();
      this.deactivate = sinon.spy();
      this.setScrollTop = sinon.spy();
      this.animatedScroll = sinon.spy();
      this.getScrollTop = sinon.spy();
      this.destroy = sinon.spy();
      this.element = document.createElement('div');
    };
  });

  test('#initialize', function() {
    assert.instanceOf(subject, Calendar.Views.TimeParent);
  });

  suite('#handleEvent', function() {

    var calledTime;
    var date = new Date(2013, 1, 1);

    setup(function() {
      calledTime = null;
      subject.changeDate = function() {
        calledTime = arguments;
      };

      // events are only listened to when
      // activated...
      subject.onactive();
    });

    test('event: selectedDayChange', function() {
      controller.selectedDay = date;
      assert.deepEqual(
        calledTime[0], date,
        'selected day should update active time'
      );
    });

    test('event: dayChange', function() {
      controller.move(date);
      assert.deepEqual(
        calledTime[0], date,
        'move - active time should change'
      );
    });

    test('dayChange changes selectedDay', function() {
      controller.move(date);
      assert.deepEqual(
        controller.selectedDay, date,
        'dayChange - selectedDay should change'
      );
    });
  });

  test('#element', function() {
    assert.equal(
      subject.element.id,
      'day-view'
    );
  });

  test('#_getId', function() {
    var date = new Date();
    var id = subject._getId(date);

    assert.equal(date.valueOf(), id);
  });

  test('#_nextTime', function() {
    var date = new Date(2012, 1, 15);
    var expected = new Date(2012, 1, 16);

    assert.deepEqual(
      subject._nextTime(date),
      expected
    );
  });

  test('#_previousTime', function() {
    var date = new Date(2012, 1, 15);
    var expected = new Date(2012, 1, 14);

    assert.deepEqual(
      subject._previousTime(date),
      expected
    );
  });

  test('#render', function() {
    var calledWith;

    subject.changeDate = function() {
      calledWith = arguments;
    };

    subject.render();

    assert.deepEqual(
      calledWith[0], controller.day
    );
  });

  suite('#oninactive', function() {

    test('event disabling', function() {
      var calledWith;

      subject.changeDate = function() {
        calledWith = arguments;
      };

      // start in active state
      subject.onactive();

      // sanity check
      controller.selectedDay = new Date();
      assert.ok(calledWith, 'should be active');
      calledWith = null;

      // disable
      subject.oninactive();

      // date must be different then above of this
      // event will not fire....
      controller.selectedDay = new Date(2012, 1, 2);
      assert.ok(!calledWith, 'should disable event listeners');
    });
  });

  suite('#onactive', function() {
    setup(function() {
      sinon.stub(subject, '_getDestinationScrollTop');
    });

    teardown(function() {
      subject._getDestinationScrollTop.restore();
    });

    test('mostRecentDayType === day', function() {
      controller.move(new Date(2012, 1, 15));
      // should do nothing special
      var selDate = new Date(2012, 1, 1);
      controller.selectedDay = selDate;
      controller.move(new Date());

      subject.onactive();

      assert.isFalse(
        Calendar.Calc.isSameDate(selDate, controller.day),
        'should not move controller'
      );

      assert.deepEqual(subject.date, controller.position);
      assert.ok(subject.currentFrame.activate.called, 'activate frame');
    });

    test('mostRecentDayType === selectedDay', function() {
      var selDate = new Date(2012, 1, 1);
      controller.move(new Date());
      controller.selectedDay = selDate;

      subject.onactive();

      assert.deepEqual(
        controller.position,
        selDate,
        'should move controller to selected day position'
      );

      assert.deepEqual(subject.date, selDate);
      assert.ok(subject.currentFrame.activate.called, 'activate frame');
    });

    test('inactive for a peroid then reactivate', function() {
      subject.onactive();
      controller.move(new Date(2011, 0, 1));

      subject.oninactive();
      controller.move(new Date(2012, 8, 1));
      assert.ok(
        subject.currentFrame.deactivate.calledOnce,
        'deactivate frame'
      );

      subject.onactive();
      assert.deepEqual(subject.date, controller.position);
      assert.ok(subject.currentFrame.activate.calledOnce, 'activate frame');
    });

    suite('pass the options param to changeDate', function() {
      setup(function() {
        sinon.stub(subject, 'changeDate');
      });

      teardown(function() {
        subject.changeDate.restore();
      });

      test('start scrolling from scrollTop 0', function() {
        var selDate = new Date(2012, 1, 1);
        controller.move(new Date());
        controller.selectedDay = selDate;

        subject.onactive();
        assert.ok(subject.changeDate.calledWithExactly(selDate, {
          startScrollTop: 0
        }));
      });
    });
  });

  suite('#changeDate', function() {
    setup(function() {
      sinon.stub(Calendar.Views.TimeParent.prototype, 'changeDate');
      subject.currentFrame = new subject.childClass();
    });

    teardown(function() {
      Calendar.Views.TimeParent.prototype.changeDate.restore();
      subject._getDestinationScrollTop.restore();
      subject.currentFrame = null;
    });

    test('do not scroll when the retun value ' +
         'of _getDestinationScrollTop is undefined', function() {
      sinon.stub(subject, '_getDestinationScrollTop', function() {
        return undefined;
      });

      subject.changeDate(new Date());
      assert.ok(subject.currentFrame.animatedScroll.notCalled);
    });

    test('scroll to scrollTop 10', function() {
      var destinationScrollTop = 10;
      sinon.stub(subject, '_getDestinationScrollTop', function() {
        return destinationScrollTop;
      });

      subject.changeDate(new Date());
      assert.ok(subject.currentFrame.animatedScroll
        .calledWithExactly(destinationScrollTop));
    });

    test('scroll to scrollTop 10 from scrollTop 0', function() {
      var destinationScrollTop = 10;
      sinon.stub(subject, '_getDestinationScrollTop', function() {
        return destinationScrollTop;
      });

      subject.changeDate(new Date(), { startScrollTop: 0 });
      assert.ok(subject.currentFrame.setScrollTop
        .calledWithExactly(0));
      assert.ok(subject.currentFrame.animatedScroll
        .calledWithExactly(destinationScrollTop));
    });
  });

  suite('#_getDestinationScrollTop', function() {
    var clock;

    setup(function() {
      var div = document.createElement('div');
      div.innerHTML = [
        '<div class="active">',
          '<div class="day-events-wrapper"',
            'style="height: 20px; overflow-y: scroll">',
            '<div class="day-events">',
              '<div class="hour-0">0AM</div>',
              '<div class="hour-8">8AM</div>',
              '<div class="hour-16">4PM</div>',
              '<div class="hour-23">11PM</div>',
            '</div>',
          '</div>',
        '</div>'
      ].join('');
      subject.element.appendChild(div);

      subject.currentFrame = {
        element: subject.element.querySelector('.active')
      };

      clock = sinon.useFakeTimers(+(new Date(2014, 8, 7, 17, 8)));
    });

    teardown(function() {
      clock.restore();
    });

    test('today', function() {
      assert.equal(
        subject._getDestinationScrollTop(new Date(2014, 8, 7, 0, 0)),
        subject.currentFrame.element.querySelector('.hour-16').offsetTop
      );
    });

    test('next day', function() {
      assert.equal(
        subject._getDestinationScrollTop(new Date(2014, 8, 8, 0, 0)),
        subject.currentFrame.element.querySelector('.hour-8').offsetTop
      );
    });

    test('next day with the onlyToday option as true', function() {
      assert.deepEqual(
        subject._getDestinationScrollTop(new Date(2014, 8, 8, 0, 0), {
          onlyToday: true
        }),
        undefined
      );
    });

    test('next day with the onlyToday option as false', function() {
      assert.deepEqual(
        subject._getDestinationScrollTop(new Date(2014, 8, 8, 0, 0), {
          onlyToday: false
        }),
        subject.currentFrame.element.querySelector('.hour-8').offsetTop
      );
    });
  });

  test('#onfirstseen', function() {
    assert.equal(subject.onfirstseen, subject.render);
  });

});
