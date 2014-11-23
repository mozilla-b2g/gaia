'use strict';

var assert = require('chai').assert;
var CellBroadcastSystem = require('./lib/cell_broadcast_system');

marionette('mozApps', function() {

  var client = marionette.client({
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false
    }
  });

  var cellBroadcastSystem = new CellBroadcastSystem(client);
  var event, system;

  setup(function() {
    system = client.loader.getAppClass('system');
  });

  suite('CellBroadcastSystem', function() {
    setup(function() {
      system.waitForStartup();
      event = {
        message: {
          body: 'test'
        }
      };
    });

    test('is shown when a message arrives', function() {
      cellBroadcastSystem.show(event);
      client.waitFor(function() {
        return cellBroadcastSystem.visible;
      });
    });

    test('does not truncate a large message', function() {
      event.message.body = 'This should be a large message and ';
      event.message.body += 'is filling up some space ';
      event.message.body += '1234567abcdefghijklmnopqrstuvwxyz';
      cellBroadcastSystem.show(event);
      var msgSize = cellBroadcastSystem.dialog.findElement('p').size();
      var screenSize = system.screenSize;
      assert.ok(msgSize.width <= screenSize.width);
    });
  });

});
