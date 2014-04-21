(function(window) {

  var worker = new TestAgent.BrowserWorker({
        /* this is where your tests will be loaded into */
        sandbox: '/test/unit/_sandbox.html'
      });

  worker.use(TestAgent.BrowserWorker.PostMessage);

  worker.use(TestAgent.BrowserWorker.MochaDriver, {
    ui: 'tdd',
    /* path to mocha */
    mochaUrl: CommonResourceLoader.url('/common/vendor/mocha/mocha.js'),

    /**
     * Important: will not cause failures if missing.
     * Allows each app to have its own setup.js file that will execute
     * before any tests are loaded so we can utilize helpers outside
     * of setup blocks. Any files require from setup.js should also
     * block loading of any tests...
     */
    testHelperUrl: [
      CommonResourceLoader.url('/common/test/helper.js'),
      CommonResourceLoader.url('/common/test/sinon_helper.js'),
      '/test/unit/setup.js'
    ],

    reporter: null
  });
  worker.use(TestAgent.BrowserWorker.BlanketDriver, {
    blanketUrl: CommonResourceLoader.url('/common/vendor/blanket/blanket.js')
  });

  //enable let, yield, etc...
  worker.loader.type = 'application/javascript;version=1.8';

  worker.on({

    'sandbox': function() {
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

  worker.start();

}(this));


