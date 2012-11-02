require('/apps/calendar/test/integration/calendar_integration.js');
require('/apps/calendar/js/calendar.js');
require('/apps/calendar/js/calc.js');

suite('calendar - advanced settings', function() {

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

  test('on initial display: no accounts are visible.', function() {
    var toggle = yield app.element('showSettingsBtn');

    yield helper.waitFor(
      toggle.displayed.bind(toggle),
      MochaTask.nextNodeStyle
    );

    yield toggle.click();

    var advancedBtn = yield app.element('showAdvancedSettingsBtn');
    yield advancedBtn.click();

    var list = yield app.element('accountList');
    var text = yield list.text();
    assert.length(text.trim(), 0, 'has no accounts');
  });

});
