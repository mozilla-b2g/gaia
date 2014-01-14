/**
 * @fileoverview A marionette test that logs something in gecko to
 *     exercise the marionette logger when --verbose is enabled in runner.
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
