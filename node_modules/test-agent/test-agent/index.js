(function(window) {

  var worker;

  worker = new TestAgent.BrowserWorker();

  var config = {
    host: window.location.hostname,
    port: window.location.port
  };

  var queryString = window.location.search.slice(1);
  queryString.split('&').forEach(function(pair) {
    var data = pair.split('=');
    var key = data[0];
    var value = data[1];
    config[key] = value;
  });

  worker.use(TestAgent.BrowserWorker.Websocket, {
    url: 'ws://' + config.host + ':' + config.port
  });

  worker.use(TestAgent.BrowserWorker.Config, {
    url: '/test-agent/config.json'
  });

  worker.use(TestAgent.BrowserWorker.MultiDomainDriver, {
    groupTestsByDomain: function(test) {
      var result = {
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
      worker.loader.require('/node_modules/expect.js/expect.js');
    },

    'open': function() {
      console.log('socket open');

      // yield to event loop before signaling worker
      // is ready, this ensures all plugins have been 
      // loaded properly before starting any tests
      setTimeout(worker.ready.bind(worker), 0);
    },

    'close': function() {
      console.log('lost client trying to reconnect');
    }

  });

  worker.config();
  worker.start();

}(this));
