define(function(require) {
'use strict';

var MultiDay = require('views/multi_day');

suite('Views.MultiDay', function() {
  var app;
  var subject;

  suiteSetup(function() {
    app = testSupport.calendar.app();
  });

  setup(function() {
    subject = new MultiDay({app: app});
    subject.element = document.createElement('div');
    subject.element.innerHTML = '<div class="md__sidebar"></div>';
    subject._currentTime = {
      refresh: this.sinon.spy()
    };
  });

  suite('#onactive', function() {
    var stubOnFirstSeen;
    var stubRender;
    var stubResetScroll;
    var stubScrollToHour;

    setup(function() {
      stubOnFirstSeen = sinon.stub(subject, 'onfirstseen');
      stubRender = sinon.stub(subject, '_render');
      stubResetScroll = sinon.stub(subject, '_resetScroll');
      stubScrollToHour = sinon.stub(subject, '_scrollToHour');
    });

    teardown(function() {
      stubOnFirstSeen.restore();
      stubRender.restore();
      stubResetScroll.restore();
      stubScrollToHour.restore();
    });

    test('First time active', function() {
      subject.onactive();
      sinon.assert.calledOnce(stubOnFirstSeen);
      sinon.assert.calledOnce(stubRender);
      sinon.assert.calledOnce(stubResetScroll);
      sinon.assert.calledOnce(stubScrollToHour);
    });

    test('Do not scroll when come back from other screen', function() {
      subject.baseDate = subject.timeController.position;
      subject.seen = true;
      subject.onactive();
      assert.isFalse(stubOnFirstSeen.called);
      assert.isFalse(stubResetScroll.called);
      assert.isFalse(stubScrollToHour.called);
    });
  });

  test('localized', function() {
    var sidebar = subject.sidebar;
    subject._visibleRange = 123;
    subject.handleEvent({type: 'localized'});

    // make sure we rebuild all hours during localize
    var i = -1, date = new Date(), hour;
    while (++i < 24) {
      date.setHours(i, 0, 0, 0);
      hour = sidebar.querySelector('.md__hour-' + i);
      assert.equal(hour.textContent, i, 'display hour');
      assert.equal(
        hour.querySelector('.md__display-hour').dataset.date,
        date,
        'date data'
      );
    }

    // make sure we update the current time
    assert.ok(
      subject._currentTime.refresh.calledOnce,
      'called refresh'
    );

    assert.equal(
      subject._currentTime.timespan,
      subject._visibleRange,
      'current time timespan matches the _visibleRange'
    );
  });

  test('#_updateBaseDateAfterScroll', function() {
    // we need to make sure it's updating the timeController position and
    // selectedDay after the drag so moving to day/month views have the
    // expected output (highlight first day of the week view)
    subject.baseDate = new Date(2014, 6, 23);
    subject._updateBaseDateAfterScroll(-3);
    var expected = (new Date(2014, 6, 20)).toISOString();
    assert.equal(
      subject.timeController.position.toISOString(),
      expected,
      'position'
    );
    assert.equal(
      subject.timeController.selectedDay.toISOString(),
      expected,
      'selectedDay'
    );
  });
});

});
