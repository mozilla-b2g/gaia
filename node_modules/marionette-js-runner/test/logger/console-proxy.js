/**
 * @fileoverview A marionette test that simply logs something in gecko.
 */
suite('console proxy', function() {
  var client = marionette.client();

  test('log in host', function(done) {
    client.executeScript(function() {
      console.log('What does the fox say');
    });

    setTimeout(done, 1000);
  });
});
