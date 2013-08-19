(function(window) {

  var worker = new TestAgent.BrowserWorker({
        /* this is where your tests will be loaded into */
        sandbox: './sandbox.html'
      });

  worker.use(TestAgent.BrowserWorker.Config, {
    /* config file which lists all available tests for the ui */
    url: './config.json'
  });

  worker.use(TestAgent.BrowserWorker.MochaDriver, {
    /* path to mocha */
    mochaUrl: '../vendor/mocha.js',
    testHelperUrl: '../test/helper.js'
  });

  worker.use(TestAgent.BrowserWorker.TestUi);
  worker.use(TestAgent.BrowserWorker.ErrorReporting);

  worker.on({

    'sandbox': function() {
    },

    'open': function() {
      console.log('socket open');
    },

    'close': function() {
      console.log('lost client trying to reconnect');
    }

  });

  worker.config();
  worker.start();

}(this));
