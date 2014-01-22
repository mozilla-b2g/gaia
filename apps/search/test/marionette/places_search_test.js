var Search = require('./lib/search');
var Server = require('../../../../shared/test/integration/server');
var assert = require('assert');

marionette('Places tests', function() {

  var client = marionette.client(Search.ClientOptions);

  var search;
  var server;

  suiteSetup(function(done) {
    Server.create(__dirname + '/fixtures/', function(err, _server) {
      server = _server;
      done();
    });
  });

  suiteTeardown(function() {
    server.stop();
  });

  setup(function() {
    search = new Search(client);
  });

  test('Search for previously visited URL', function() {
    var url = server.url('sample.html');
    search.doSearch(url + '\uE006');
    search.waitForBrowserFrame();
    search.doSearch(url);
    search.goToResults();
    search.checkResult('firstPlace', 'Sample page');
  });

  test('Ensures urls visited twice only show in results once', function() {
    var url = server.url('sample.html');
    search.doSearch(url + '\uE006');
    search.waitForBrowserFrame();
    search.doSearch(url + '\uE006');
    search.waitForBrowserFrame();
    search.doSearch(url);
    search.goToResults();

    // Wait to get the correct amount of results
    client.waitFor(function() {
      return client.findElements(Search.Selectors.firstPlace).length === 1;
    }.bind(this));

    // Wait for a second and check we dont get extra results
    client.helper.wait(1000);
    assert.equal(client.findElements(Search.Selectors.firstPlace).length, 1);
  });

  test.skip('Ensure favicon is loaded', function() {
    var url = server.url('favicon.html');
    search.doSearch(url + '\uE006');
    search.waitForBrowserFrame();

    client.waitFor(function() {
      search.doSearch(url);
      search.goToResults();
      var result = client.helper.waitForElement('#places div .favicon');
      return !result.getAttribute('class').match('empty');
    });
  });

});
