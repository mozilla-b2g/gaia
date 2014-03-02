var Browser = require('./lib/browser'),
    assert = require('assert');

marionette('Awesomescreen', function() {
  var client = marionette.client();
  var subject;

  setup(function() {
    subject = new Browser(client);
    subject.launch();

    client.helper.waitForElement('body.loaded');
    client.setSearchTimeout(10000);
  });

  suite('Open awesomescreen', function() {

    setup(function() {
      subject.searchBar.click();
    });

    test('Awesomescreen is open', function() {
      client.helper.waitForElement('#awesomescreen');
      assert.ok(true, 'Awesome screen is shown');
    });

  });

});
