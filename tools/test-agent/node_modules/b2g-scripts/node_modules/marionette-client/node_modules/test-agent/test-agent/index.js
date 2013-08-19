(function(window) {

  var worker;

  worker = new TestAgent.BrowserWorker({
    sandbox: '/test-agent/sandbox.html'
  });

  worker.use(TestAgent.BrowserWorker.Config, {
    url: '/test-agent/config.json'
  });

  worker.use(TestAgent.BrowserWorker.MochaDriver, {
    mochaUrl: '/mocha/mocha.js',
    testHelperUrl: '/test/helper.js'
  });

  worker.use(TestAgent.BrowserWorker.TestUi);
  worker.use(TestAgent.BrowserWorker.ErrorReporting);

  worker.on({

    'sandbox': function() {
      worker.loader.require('/vendor/expect.js');
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
