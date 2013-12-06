var Search = require('./lib/search');
var Contacts = require(
  '../../../communications/contacts/test/marionette/lib/contacts');
var Calendar = require('../../../calendar/test/marionette/calendar');
var assert = require('assert');

marionette('contact search', function() {
  var client = marionette.client({
    settings: {
      'keyboard.ftu.enabled': false,
      'rocketbar.enabled': true
    }
  });

  test('able to search contact from rocketbar', function() {

    client.helper.waitForElement(Search.Selectors.statusBar).click();

    var resultsFrame = client.helper
      .waitForElement(Search.Selectors.searchInput);

    client.helper.waitForElement(Search.Selectors.searchInput)
      .sendKeys('calendar');

    client.switchToFrame(resultsFrame);

    var result = client.helper.waitForElement(Search.Selectors.firstApp);

    assert.equal('Calendar', result.text());

    result.click();

    client.switchToFrame();
    client.apps.switchToApp(Calendar.ORIGIN);

    client.helper.waitForElement('body');
  });

});
