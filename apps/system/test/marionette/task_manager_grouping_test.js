'use strict';

var TaskManager = require('./lib/task_manager');
var Server = require('../../../../shared/test/integration/server');
var Rocketbar = require('./lib/rocketbar');
var FakeApp = require('./lib/fakeapp');
var assert = require('assert');

marionette('Task Manager App Grouping', function() {

  var firstAppOrigin  = 'fakeapp.gaiamobile.org';
  var actions;
  var system, taskManager, server, home, rocketbar, search;
  var firstApp;
  var url1, url2;
  var apps = {};
  apps[firstAppOrigin]  = __dirname + '/../apps/fakeapp';

  var client = marionette.client({
    profile: {
      apps: apps,
      settings: {
        'app.cards_view.appgrouping.enabled': true
      }
    }
  });

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
    system = client.loader.getAppClass('system');
    taskManager = new TaskManager(client);
    home = client.loader.getAppClass('verticalhome');
    rocketbar = new Rocketbar(client);
    search = client.loader.getAppClass('search');
    actions = client.loader.getActions();

    system.waitForFullyLoaded();

    firstApp = new FakeApp(client, 'app://' + firstAppOrigin);
    firstApp.launch();
    system.goHome();
    system.waitUntilScreenshotable(firstApp.iframe);

    url1 = server.url('sample.html');
    url2 = server.url('darkpage.html');

    // Open the first URL in a sheet.
    rocketbar.homescreenFocus();
    rocketbar.enterText(url1, true);

    // Switch to the app
    system.gotoBrowser(url1);
    system.goHome();

    // Open the 2nd URL in a sheet.
    rocketbar.homescreenFocus();
    rocketbar.enterText(url2, true);

    // Switch to the app
    system.gotoBrowser(url2);
    system.goHome();

  });

  suite('show', function() {
    setup(function() {
      taskManager.show();
    });
    teardown(function() {
      taskManager.hide();
    });

    test('should group same-hostname cards',
    function() {
      var cardCount = taskManager.cards.length;
      assert.equal(cardCount, 2);
      var current = taskManager.cards[cardCount -1];
      var title = client.helper.waitForElement(current.findElement('.title'));
      assert.equal(title.text(), 'Dark page');
    });

    test('closing front window',
    function() {
      var cardCount = taskManager.cards.length;
      var current = taskManager.cards[cardCount -1];
      var title = client.helper.waitForElement(current.findElement('.title'));
      var initialTitle = title.text();
      var closeButton = current.findElement(taskManager.selectors.closeButton);
      closeButton.tap();
      assert.equal(taskManager.cards.length, 2);
      client.waitFor(function() {
        return initialTitle !== title.text();
      });
      assert.equal(title.text(), 'Sample page');
    });
  });

});
