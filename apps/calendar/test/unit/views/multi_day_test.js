requireLib('views/multi_day.js');

suiteGroup('Views.MultiDay', function() {
  'use strict';

  var app;
  var subject;

  suiteSetup(function() {
    app = testSupport.calendar.app();
  });

  setup(function() {
    subject = new Calendar.Views.MultiDay({app: app});
    subject.element = document.createElement('div');
    subject.element.innerHTML = '<div class="sidebar"></div>';
    subject._currentTime = {
      refresh: this.sinon.spy()
    };
  });

  test('localized', function() {
    subject._visibleRange = 123;
    subject.handleEvent({type: 'localized'});

    // make sure we rebuild all hours during localize
    var i = -1, h;
    while (++i < 24) {
      h = i % 12 || 12;
      assert.include(
        subject.sidebar.innerHTML,
        '<li class="hour hour-' + i + '">' +
          '<span class="display-hour">' + h + '<span class="ampm">' +
          (i < 12 ? 'AM' : 'PM') +
          '</span></span>' +
        '</li>'
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

});
