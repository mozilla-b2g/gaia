(function(window) {

  var worker;

  worker = new TestAgent.BrowserWorker();

  worker.use(TestAgent.BrowserWorker.Websocket, {
    url: 'ws://' + window.location.host
  });

  worker.use(TestAgent.BrowserWorker.Config, {
    url: '/test-agent/config.json'
  });

  worker.use(TestAgent.BrowserWorker.MultiDomainDriver, {
    groupTestsByDomain: function(test) {
      var result =  {
        domain: './proxy.html',
        test: test,
        env: 'TA'
      };


      return result;
    }
  });

  worker.use(TestAgent.BrowserWorker.TestUi);
  worker.use(TestAgent.BrowserWorker.ErrorReporting);

  worker.use(TestAgent.Common.MochaTestEvents, {
    defaultMochaReporter: 'HTML'
  });

  worker.on({

    'run tests': function() {
    },

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
