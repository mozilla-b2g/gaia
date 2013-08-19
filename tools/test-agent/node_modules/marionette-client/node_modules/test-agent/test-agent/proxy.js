(function(window) {

  var worker;

  worker = new TestAgent.BrowserWorker({
    sandbox: './sandbox.html'
  });

  worker.use(TestAgent.BrowserWorker.PostMessage);

  worker.use(TestAgent.BrowserWorker.MochaDriver, {
    mochaUrl: '/node_modules/mocha/mocha.js',
    testHelperUrl: '/test/helper.js',
    //don't need a reporter for proxy
    reporter: null
  });

  worker.use(TestAgent.BrowserWorker.ErrorReporting);

  worker.on({

    'sandbox': function() {
      worker.loader.require('/node_modules/expect.js/expect.js');
    },

    'open': function() {
    },

    'close': function() {
    }

  });

  worker.start();

}(this));

