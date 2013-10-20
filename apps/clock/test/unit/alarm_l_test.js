suite.only('AlarmList debug', function() {
  var debug;
  suiteSetup(function(done) {
    setTimeout(
      function() {
        var scriptMarkup = Array.prototype.map.call(
          document.querySelectorAll('script'),
          function(script) {
            return (script.outerHTML.match(/(<[^>]*>)/) || [])[0];
          }
        );
        debug = [
          'Tag count: ' + scriptMarkup.length,
          scriptMarkup.join('\n  '),
          'window.onerrors: ' + window.onerrors.length,
          'window.onerror: ' + (window.onerror || 'nada').toString(),
          'window.onerror changed? ' + (window.onerror !== window.onerrors[0])
        ].join('\n');

        // Ensure that Mocha is still failing to catch asynchronous errors
        throw new Error('This seems like it should make the test fail...');

        done();
      },
      3000
    );

    // Account for potentially-slow file loading operations
    this.timeout(10000);
  });

  test('ensure that the suiteSetup is invoked', function() {
    throw new Error(debug);
  });
});
