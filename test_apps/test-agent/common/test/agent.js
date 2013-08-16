(function(window) {

  /**
   * Keep awake utility to ensure device does
   * not go to sleep before the test completes.
   */
  var KeepAwake = (function() {

    var running = false,
        power = navigator.mozPower;

     return {

      _activate: function ka_activate() {
        if (running) {
          try {
            power.screenEnabled = true;
          } catch (e) {
            //during desktop we don't care if this
            //fails. In app context it will always work.
          }
          setTimeout(ka_activate, 800);
        }
      },

      start: function ka_start() {
        running = true;
        this._activate();
      },

      stop: function ka_stop() {
        running = false;
      }
    };
  }());

  /**
   * For CI (and maybe for other uses)
   * we want to configure the agent
   * with url options.
   *
   * Options are taken from the hash rather
   * then the query string for future use
   * of offline cache.
   *
   * http://test-agent.gaiamobile.org/index.html#?key=value
   */
  var AgentConfig = (function() {
    var params = window.location.hash,
        index = params.indexOf('?'),
        options = {
          websocketUrl: null
        };

    if (index > -1) {
      params.slice(index + 1).split('&').forEach(function(pair) {
        var split = pair.split('=');
        if (split.length === 2) {
          options[split[0]] = split[1];
        }
      });
    }

    return options;
  }());

  console.log(AgentConfig);

  var worker = new TestAgent.BrowserWorker({
        /* this is where your tests will be loaded into */
        sandbox: './sandbox.html'
      });

  worker.use(TestAgent.BrowserWorker.Config, {
    /* config file which lists all available tests for the ui */
    url: './config.json'
  });

  worker.use(TestAgent.BrowserWorker.Websocket, {
    url: AgentConfig.websocketUrl
  });

  worker.use(TestAgent.BrowserWorker.MultiDomainDriver, {
    groupTestsByDomain: function(test) {

      var testsDir = '/test/unit/';

      var parsed = TestUrlResolver.parse(test);

      var env = parsed.host;

      // any sub-folders that contain unit tests
      // will be sandboxed in their own environment
      var testsDirIndex = parsed.url.indexOf(testsDir);
      if (testsDirIndex > 0) {
          env += '-'+ parsed.url.slice(0, testsDirIndex);
      }

      var result = {
        domain: parsed.domain + testsDir + '_proxy.html',
        test: '/' + parsed.url,
        env: env
      };

      return result;
    }
  });

  worker.use(TestAgent.BrowserWorker.TestUi);
  worker.use(TestAgent.BrowserWorker.ErrorReporting);

  worker.use(TestAgent.Common.MochaTestEvents, {
    defaultMochaReporter: 'HTML'
  });

  worker.use(TestAgent.Common.BlanketCoverEvents);

  worker.on({

    'open': function() {
      setTimeout(worker.ready.bind(worker), 0);
    },

    'test runner': function() {
      KeepAwake.start();
    },

    'test runner end': function() {
      KeepAwake.stop();
    }

  });

  worker.config();
  worker.start();

}(this));

