suite.only('AlarmList debug', function() {
  suiteSetup(function(done) {
    setTimeout(
      function() {
        // Throwing errors is the only consistent way to print information to
        // the screen during a test run on TravisCI, so throw one here to
        // ensure that the previous statement did indeed throw an error, even
        // if Mocha does not report it.
        done();
      },
      3000
    );

    // Account for potentially-slow file loading operations
    this.timeout(10000);
  });

  test('ensure that the suiteSetup is invoked', function() {
    var scriptMarkup = Array.prototype.map.call(
      document.querySelectorAll('script'),
      function(script) {
        return (script.outerHTML.match(/(<[^>]*>)/) || [])[0];
      }
    );
    var debug = 'Tag count: ' + scriptMarkup.length;
    debug += '\n  ' + scriptMarkup.join('\n  ') + '\n';
    debug += 'window.onerror: ' + (window.onerror || 'nada').toString();

    throw new Error(debug);
  });
});
