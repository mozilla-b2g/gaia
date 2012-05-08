(function(window) {
  var support;
  if (typeof(window.testSupport) === 'undefined') {
    window.testSupport = {};
  }

  support = window.testSupport;
  support.startMarionette = function(cb) {
    var device;

    suiteSetup(function() {
      this.timeout(10000);

      var driver = new Marionette.Drivers.HttpdPolling({
        //should be an environmental variable
        proxyUrl: 'http://localhost:8080/marionette'
      });

      yield driver.connect(MochaTask.next);
      device = new Marionette.Client(driver, {
        defaultCallback: MochaTask.next
      });
      yield device.startSession();

      cb(device);
    });

    suiteTeardown(function() {
      this.timeout(10000);
      yield device.deleteSession();
    });

  }
}(this));
