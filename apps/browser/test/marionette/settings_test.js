var Browser = require('./lib/browser'),
    assert = require('assert');

marionette('Settings', function() {
  var client = marionette.client();

  var subject;

  setup(function() {
    subject = new Browser(client);
    subject.launch();

    client.helper.waitForElement('body.loaded');
    client.setSearchTimeout(10000);
  });

  suite('Open settings', function() {

    setup(function() {
      subject.tabsBadge.click();
      client.helper.waitForElement('#tray');
      subject.settingsButton.click();
    });

    test('Settings is open', function() {
      client.helper.waitForElement('#settings');
      assert.ok(true, 'Settings is shown');
    });

    test('No search engine choices', function() {
      client.helper.waitForElement('#settings');
      var searchEngineSection = client.findElement('#search-engine-section');
      assert.ok(!searchEngineSection.displayed(),
        'Search engine choices are not shown');
    });

  });

});
