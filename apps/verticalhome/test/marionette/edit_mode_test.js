'use strict';

marionette('Vertical - Edit Mode', function() {

  var client = marionette.client(require(__dirname + '/client_options.js'));
  var actions, home, system;
  var selectors;

  setup(function() {
    actions = client.loader.getActions();
    home = client.loader.getAppClass('verticalhome');
    system = client.loader.getAppClass('system');
    system.waitForStartup();
    selectors = home.Selectors;

    client.apps.launch(home.URL);

    home.waitForLaunch();
  });

  test('Exit edit mode using done button', function() {
    home.enterEditMode();
    var header = client.findElement(selectors.editHeaderText);
    var done = client.helper.waitForElement(selectors.editHeaderDone);
    done.click();
    client.helper.waitForElementToDisappear(header);
  });

});
