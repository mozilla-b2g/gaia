(function(window){

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
    mochaUrl: './vendor/mocha/mocha.js',
    /* path to your test helper this is required, but it can be a blank file if you like */
    testHelperUrl: './helper.js'
  });

  worker.use(TestAgent.BrowserWorker.TestUi);

  worker.on({

    'sandbox': function() {
      /* Load your fav assertion engine */
      /* expect.js
      worker.loader.require('https://raw.github.com/LearnBoost/expect.js/master/expect.js');      
      */
    },

    'open': function(){
      console.log('socket open');
    },

    'close': function(){
      console.log('lost client trying to reconnect');
    }

  });

  worker.config();
  worker.start();

}(this));
