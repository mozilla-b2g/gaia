require('/apps/calendar/test/integration/calendar_integration.js');
require('/apps/calendar/js/calendar.js');
require('/apps/calendar/js/calc.js');

suite('calendar - launch', function() {

  var device;
  var helper = IntegrationHelper;
  var app;

  suiteTeardown(function() {
    yield app.close();
  });

  MarionetteHelper.start(function(client) {
    app = new CalendarIntegration(client);
    device = app.device;
  });

  suiteSetup(function() {
    yield app.launch();
  });

  test('starting display', function() {
    var remoteDate = yield app.remoteDate();
    var month = yield app.element('monthView');

    // should start at month view
    yield app.waitUntilElement(month, 'displayed');

    var today = yield month.findElement(app.selector('present'));
    var id = yield today.getAttribute('data-date');
    var date = Calendar.Calc.dateFromId(id);

    // should highlight current date at the 'present'
    assert.deepEqual(
      Calendar.Calc.createDay(remoteDate),
      Calendar.Calc.createDay(date),
      'should display present day'
    );
  });

  test('initial calendars', function() {
    var toggle = yield app.element('showSettingsBtn');

    yield helper.waitFor(
      toggle.displayed.bind(toggle),
      MochaTask.nextNodeStyle
    );

    yield toggle.click();

    var calendars = yield app.element('calendarList');
    var text = yield calendars.text();

    assert.ok(text, 'has calendars');

    assert.match(
      text, /offline/i,
      'starts with offline calendar'
    );
  });

});
