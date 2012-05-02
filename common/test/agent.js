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
    ui: 'tdd',
    /* path to mocha */
    mochaUrl: CommonResourceLoader.url('/common/vendor/mocha/mocha.js'),
    testHelperUrl: CommonResourceLoader.url('/common/test/helper.js')
  });


  worker.use(TestAgent.BrowserWorker.TestUi);
  worker.use(TestAgent.BrowserWorker.ErrorReporting);

  //enable let, yield, etc...
  worker.loader.type = 'application/javascript;version=1.8';

  worker.addTestsProcessor(function(tests) {
    return tests.map(function(item) {
      var val = TestUrlResolver.resolve(item);
      return val;
    });
  });

  worker.on({

    'sandbox': function() {
      /* Load your fav assertion engine */
      /* expect.js
      */
    },

    'run tests': function() {
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

