suite('window.onerror', function() {
  test('Invoked for uncaught errors', function(done) {

    window.onerror = function() {
      done();
    };

    setTimeout(function() {
      throw new Error();
    }, 0);
  });
});
