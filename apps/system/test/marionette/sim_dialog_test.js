'use strict';

marionette('Sim Dialog:', function() {

  var assert = require('assert');

  var pinInput = 'input[name=simpin]';
  var submitBtn = '#simpin-dialog button[type=submit]';

  var client = marionette.client({
    prefs: {
      'focusmanager.testmode': true,
      'dom.w3c_touch_events.enabled': 1
    },
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false
    }
  });

  setup(function() {
  });

  function loadScripts(scripts) {

    if (!scripts.length) {
      return;
    }

    var path = scripts.pop();
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = path;
    script.async = false;
    script.addEventListener('load', function() {
      loadScripts(scripts);
    });
    document.body.appendChild(script);
  }

  test.skip('Input is shown with error', function() {

    client.executeScript(loadScripts, [[
      'js/mock_simslot.js',
      'js/mock_simslot_manager.js'
    ]]);

    client.executeScript(function(path) {

      var win = window.wrappedJSObject;
      var slot = new win.MockSIMSlot(null, 0);

      win.MockSIMSlotManager.mInstances = [slot];
      win.SIMSlotManager = win.MockSIMSlotManager;
      slot.simCard.cardState = 'pinRequired';

      win.SimPinDialog.init();
      win.SimPinDialog.show(slot);
      win.SimPinDialog.handleError({
        retryCount: 1,
        lockType: 'pin'
      });
    });

    client.findElement(pinInput).tap();

    // Wait for keyboard to show up
    client.waitFor(function() {
      var keyboard = client.findElement('#keyboards');
      return keyboard.displayed() &&
        !keyboard.getAttribute('data-transition-in');
    });

    var inputSize = client.findElement(pinInput).size();
    var inputLocation = client.findElement(pinInput).location();
    var buttonLocation = client.findElement(submitBtn).location();

    assert.ok(inputLocation.y + inputSize.height < buttonLocation.y,
              'The bottom of the input is above the buttons');
  });
});
