(function(window) {

  var worker = new TestAgent.BrowserWorker({
        /* this is where your tests will be loaded into */
        sandbox: './sandbox.html'
      });

  worker.use(TestAgent.BrowserWorker.Config, {
    /* config file which lists all available tests for the ui */
    url: './config.json'
  });

  worker.use(TestAgent.BrowserWorker.Websocket);

  worker.use(TestAgent.BrowserWorker.MultiDomainDriver, {
    groupTestsByDomain: function(test) {

      var parsed = TestUrlResolver.parse(test);

      var result =  {
        domain: parsed.domain + '/test/unit/_proxy.html',
        test: '/' + parsed.url,
        env: parsed.host
      };

      console.log(result);

      return result;
    }
  });

  worker.use(TestAgent.BrowserWorker.TestUi);
  worker.use(TestAgent.BrowserWorker.ErrorReporting);

  worker.use(TestAgent.Common.MochaTestEvents, {
    defaultMochaReporter: 'HTML'
  });

  var displayTimeout,
      testsRunning = false;

  function keepScreenAwake() {
    if(testsRunning) {
      navigator.mozPower.screenEnabled = true;
      displayTimeout = setTimeout(function() {
        keepScreenAwake();
      }, 800);
    }
  }

  worker.on({

    'sandbox': function() {
      /* Load your fav assertion engine */
      /* expect.js
      */
    },

    'run tests': function() {
      console.log('run:', arguments);
    },

    'test runner': function() {
      testsRunning = true;
      keepScreenAwake();
    },

    'test runner end': function() {
      testsRunning = false;
    },

    'open': function() {
    },

    'close': function() {
    }

  });

  worker.config();
  worker.start();

}(this));

