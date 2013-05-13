(function(window) {

  var worker;

  worker = new TestAgent.BrowserWorker({
    sandbox: './sandbox.html'
  });

  worker.use(TestAgent.BrowserWorker.PostMessage);

  worker.use(TestAgent.BrowserWorker.MochaDriver, {
    mochaUrl: '/mocha/mocha.js',
    testHelperUrl: '/test/helper.js',
    //don't need a reporter for proxy
    reporter: null
  });

  worker.use(TestAgent.BrowserWorker.ErrorReporting);

  worker.on({

    'sandbox': function() {
      worker.loader.require('/vendor/expect.js');
    },

    'open': function() {
    },

    'close': function() {
    }

  });

  worker.start();

}(this));

