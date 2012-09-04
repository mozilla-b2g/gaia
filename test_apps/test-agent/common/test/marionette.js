(function(window) {
  var support;
  if (typeof(window.testSupport) === 'undefined') {
    window.testSupport = {};
  }

  support = window.testSupport;

  support.startMarionette = function(cb) {
    var device;

    suiteSetup(function() {
      var driver;
      this.timeout(10000);

      if (typeof(window.TCPSocket) !== 'undefined') {
        driver = new Marionette.Drivers.MozTcp();
      } else {
        driver = new Marionette.Drivers.HttpdPolling({
          //should be an environmental variable
          proxyUrl: 'http://localhost:8080/marionette'
        });
      }

      yield driver.connect(MochaTask.next);

      device = new Marionette.Client(driver, {
        defaultCallback: MochaTask.nextNodeStyle
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
