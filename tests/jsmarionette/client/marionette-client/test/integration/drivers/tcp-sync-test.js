/* global assert */
'use strict';
require('../../helper');

suite('drivers/tcp-sync', function() {
  var client = marionette.client();

  test('can execute sync commands', function() {
    client.goUrl('http://yahoo.com');
    client.goUrl('http://google.com');
    client.goUrl('http://yahoo.com');
    var location = client.executeScript(function() {
      return window.location.href;
    });
    assert.ok(location.indexOf('yahoo.com') !== -1);
  });

});
