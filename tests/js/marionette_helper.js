var MarionetteHelper = {

  /**
   * Starts a marionette instance.
   *
   *    suite('my integration test', function() {
   *      var device;
   *
   *      MarionetteHelper.start(function(client) {
   *        device = client;
   *      });
   *
   *    });
   *
   *
   * @param {Function} [client=Marionette.Client] client object.
   * @param {Function} callback passes ready to use driver instance. [driver].
   */
  start: function(client, callback) {
    var device;

    // check if custom client has been provided.
    if (arguments.length === 1) {
      callback = client;
      client = Marionette.Client;
    }

    suiteSetup(function() {
      var driver;
      this.timeout(10000);

      if (typeof(window.TCPSocket) === 'undefined') {
        throw new Error('TCPSocket must be present to run integration tests');
      }

      driver = new Marionette.Drivers.MozTcp();

      yield driver.connect(MochaTask.next);

      device = new Marionette.Client(driver, {
        defaultCallback: MochaTask.nextNodeStyle
      });

      yield device.startSession();

      callback(device);
    });

    suiteTeardown(function() {
      this.timeout(10000);
      yield device.deleteSession();
    });
  }

};
