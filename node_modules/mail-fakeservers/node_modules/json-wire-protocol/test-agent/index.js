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
    mochaUrl: '/node_modules/mocha/mocha.js',
    testHelperUrl: '../test/setup.js',
    reporter: 'HTML',
    ui: 'tdd'
  });

  worker.use(TestAgent.BrowserWorker.Websocket);
  worker.use(TestAgent.BrowserWorker.TestUi);
  worker.use(TestAgent.BrowserWorker.ErrorReporting);

  worker.on({
    'open': function() {
      setTimeout(worker.ready.bind(worker));
    },

    'close': function() {
      console.log('lost client trying to reconnect');
    }

  });

  worker.config();
  worker.start();

}(this));

