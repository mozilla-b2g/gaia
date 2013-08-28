requireCommon('test/synthetic_gestures.js');

suiteGroup('Views.TimeHeader', function() {

  var subject;
  var app;
  var store;
  var controller;
  var date = new Date(2012, 0, 1);
  var fmt;
  var monthTitle;

  suiteSetup(function() {
    fmt = navigator.mozL10n.DateTimeFormat();
  });

  teardown(function() {
    var el = document.getElementById('test');
    el.parentNode.removeChild(el);
  });

  setup(function() {
    var div = document.createElement('div');
    div.id = 'test';
    div.style.width = '380px';
    div.innerHTML = [
      '<div id="wrapper"></div>',
      '<header style="width: 380px;" id="time-header">',
        '<button class="settings"></button>',
        '<h1 style="width: 380px;">I AM TE HFOO</h1>',
      '</div>'
    ].join('');

    document.body.appendChild(div);

    app = testSupport.calendar.app();
    controller = app.timeController;

    subject = new Calendar.Views.TimeHeader({
      app: app
    });

    controller.move(date);
    monthTitle = fmt.localeFormat(
      date,
      '%B %Y'
    );
  });

  test('initialization', function() {
    assert.instanceOf(subject, Calendar.View);
    assert.equal(subject.app, app);
    assert.ok(subject.element);
    assert.equal(
      subject.element, document.querySelector('#time-header')
    );
  });

  test('#settings', function() {
    assert.ok(subject.settings);
  });

  test('#title', function() {
    assert.ok(subject.title);
  });

  test('#getScale', function() {
    var out = subject.getScale('month');
    assert.deepEqual(
      out,
      monthTitle
    );
  });

  test('#getScale shortform', function() {
    controller.move(new Date(2012, 10, 30));
    var shortScale = subject.getScale('week', true);
    var normalScale = subject.getScale('week');

    assert.isTrue(
      shortScale.length < normalScale.length,
      'short form is actually shorter'
    );
  });

  // When week starts in one month
  // and ends in another we need
  // 'Month1 Month2 Year' like header
  test('#getScale for week', function() {
    controller.move(new Date(2012, 0, 30));
    var firstMonth = fmt.localeFormat(
      new Date(2012, 0, 30),
      '%B'
    );

    var secondMonth = fmt.localeFormat(
      new Date(2012, 1, 1),
      '%B %Y'
    );
    var out = subject.getScale('week');
    assert.include(out, firstMonth);
    assert.include(out, secondMonth);
  });

  // 'November December 2012' use short form: 'Nov Dec 2012'
  test('#getScale for week short forms', function() {
    controller.move(new Date(2012, 10, 30));
    var firstMonth = fmt.localeFormat(
      new Date(2012, 10, 30),
      '%b '
    );
    var secondMonth = fmt.localeFormat(
      new Date(2012, 11, 1),
      '%b %Y'
    );
    var out = subject.getScale('week');
    // This is always too small so the short form is forced
    subject.title.style.maxWidth = '10px';
    var textWidth = subject._getTextWidth(subject.title, out);
    controller.scale = 'week';
    subject._updateTitle();
    assert.operator(textWidth, '>', subject.title.clientWidth);

    assert.equal(
      subject.title.textContent,
      firstMonth + secondMonth
    );
  });

  test('#_updateTitle', function() {
    subject._updateTitle();

    assert.equal(
      subject.title.dataset.date,
      controller.position.toString(),
      'sets element date'
    );

    assert.equal(
      subject.title.dataset.l10nDateFormat,
      subject.scales.month,
      'sets element scale'
    );

    assert.equal(
      subject.title.textContent,
      subject.getScale('month')
    );
  });

  suite('changing scales', function() {

    var calledWith;

    setup(function() {
      controller.move(date);
      controller.scale = 'year';

      subject._updateTitle = function() {
        calledWith = arguments;
      };
      // setup initial scale
      subject.render();
      calledWith = null;
    });

    test('initial change', function() {
      controller.move(new Date(
        date.getFullYear(),
        1
      ));

      assert.ok(!calledWith, 'dont re-render out of scale');
      controller.move(new Date(2020, 1));
      assert.ok(calledWith);
    });

    test('change scale', function() {
      controller.scale = 'month';
      assert.ok(calledWith);
      calledWith = null;

      controller.move(new Date(
        date.getFullYear(),
        date.getMonth() + 1
      ));

      assert.ok(calledWith);
    });

  });

});
