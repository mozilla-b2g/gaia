'use strict';

var Home2 = require('./lib/home2');
var System = require('../../../../apps/system/test/marionette/lib/system');
var AppInstall =
  require('../../../../apps/system/test/marionette/lib/app_install');
var AppInstall =
  require('../../../../apps/system/test/marionette/lib/app_install');
var createAppServer = require('./server/parent');

marionette('app installs', function() {
  var client = marionette.client(Home2.clientOptions);

  var server;
  setup(function(done) {
    createAppServer(client, function(err, _server) {
      server = _server;
      done(err);
    });
  });

  var subject;
  var system;
  var appInstall;
  setup(function() {
    subject = new Home2(client);
    system = new System(client);
    appInstall = new AppInstall(client);

    system.waitForStartup();
    subject.waitForLaunch();
  });

  teardown(function(done) {
    server.close(done);
  });

  function hasClass(element, className) {
    var classes = element.getAttribute('className');
    return classes.indexOf(className) !== -1;
  }

  test('app loading spinner', function() {
    // go to the system app
    client.switchToFrame();

    // don't let the server send the zip archive
    server.cork();
    appInstall.installPackage(server.manifestURL);

    // switch back to the homescreen
    client.switchToFrame(system.getHomescreenIframe());

    var appIcon = subject.getIcon(server.manifestURL);
    // wait until the icon is spinning!
    client.waitFor(hasClass.bind(this, appIcon, 'loading'));
    // let the rest of the app come through
    server.uncork();
    // wait until it is no longer loading
    client.waitFor(function() {
      return !hasClass(appIcon, 'loading');
    });
  });

});
