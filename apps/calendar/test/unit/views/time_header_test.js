requireCommon('test/synthetic_gestures.js');

requireApp('calendar/test/unit/helper.js', function() {
  requireLib('models/calendar.js');
  requireLib('templates/calendar.js');
  requireLib('views/time_header.js');
});

suite('views/time_header', function() {

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
    div.innerHTML = [
      '<div id="wrapper"></div>',
      '<header id="time-header">',
        '<button class="settings"></button>',
        '<h1></h1>',
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

  test('#monthScaleTitle', function() {
    var out = subject.monthScaleTitle();
    assert.deepEqual(
      out,
      monthTitle
    );
  });

  test('#_updateTitle', function() {
    subject._updateTitle();
    assert.equal(
      subject.title.textContent,
      subject.monthScaleTitle()
    );
  });

  test('controller: monthChange event', function() {
    var date = new Date(2012, 5, 1);
    var out = fmt.localeFormat(date, '%B %Y');
    controller.move(date);
    assert.deepEqual(subject.title.textContent, out);
  });

});
