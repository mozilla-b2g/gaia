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
    testHelperUrl: CommonResourceLoader.url('/common/test/helper.js'),
    reporter: null
  });

  //enable let, yield, etc...
  worker.loader.type = 'application/javascript;version=1.8';

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

  worker.start();

}(this));


