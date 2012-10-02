requireCommon('test/synthetic_gestures.js');

requireApp('calendar/test/unit/helper.js', function() {
  requireLib('ordered_map.js');
  requireLib('timespan.js');
  requireLib('templates/day.js');
  requireLib('templates/week.js');
  requireLib('views/time_parent.js');
  requireLib('views/day_based.js');
  requireLib('views/day_child.js');
  requireLib('views/week_child.js');
  requireLib('views/day.js');
  requireLib('views/week.js');
});

suite('views/day', function() {
  var subject,
      app,
      controller,
      busytimes,
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
      '<div id="week-view">',
        '<section class="sidebar">a</section>',
        '<section class="children">a</section>',
      '</div>'
    ].join('');

    document.body.appendChild(div);

    app = testSupport.calendar.app();
    controller = app.timeController;
    controller.move(new Date());

    subject = new Calendar.Views.Week({
      app: app
    });

  });

  test('#initialize', function() {
    assert.instanceOf(subject, Calendar.Views.Day);
  });

  test('#element', function() {
    assert.equal(
      subject.element.id,
      'week-view'
    );
  });

  test('#childContainer', function() {
    assert.ok(subject.childContainer);
  });

  test('#sidebar', function() {
    assert.ok(subject.sidebar);
  });

  test('#_createChild', function() {
    var time = new Date();
    var child = subject._createChild(time);

    assert.equal(child.date, time);
    assert.equal(child.app, app);
    assert.instanceOf(
      child, Calendar.Views.WeekChild
    );
  });

  test('#onfirstseen', function() {
    assert.equal(subject.onfirstseen, subject.render);
  });

  test('#onactive', function() {
    subject.onactive();

    var frames = [];
    var container = subject.childContainer.children;
    var i = 0;
    var len = container.length;
    var key;

    for (; i < len; i++) {
      // gather all active children
      if (container[i].classList.contains('active')) {
        frames.push(container[i].style.transform);
      }
    }

    // verify that we have positioned them.
    assert.length(
      frames, subject.visibleChildren
    );
  });

  suite('#render', function() {
    setup(function() {
      subject.render();
    });

    test('#_appendSidebarHours', function() {
      var html = subject.sidebar.outerHTML;
      assert.ok(html, 'has contents');

      assert.include(html, Calendar.Calc.ALLDAY);

      var i = 0;
      for (; i < 24; i++) {
        assert.include(html, i, 'has hour #' + i);
        assert.include(
          html, Calendar.Calc.formatHour(i),
          'has display hour #' + i
        );
      }
    });
  });

});
