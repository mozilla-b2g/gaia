(function(window) {
  window.suiteGroup = function suiteGroup(name, callback) {
    suite(name, function() {

      suiteSetup(function(done) {
        Calendar.App.loadObject(name, done);
      });

      callback();
    });
  };

}(this));
