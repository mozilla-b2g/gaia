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
        debug = 'Tag count: ' + scriptMarkup.length;
        debug += '\n  ' + scriptMarkup.join('\n  ') + '\n';
        debug += 'window.onerror: ' + (window.onerror || 'nada').toString();

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
