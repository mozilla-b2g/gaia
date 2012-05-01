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

  let TestUrlResolver = (function() {

    let location = window.location,
        domainParts = window.location.host.split('.'),
        addSubdomain = false,
        prefix = null;

    if (domainParts.length === 3) {
      //running from gaiamobile.org subdomain
      addSubdomain = true;
    } else {
      //running from localhost
      addSubdomain = false;
    }

    return {
      PARSE_REGEX: /^(\/?)([\w\d-]+)\/(.*)/,

      resolve: function tur_testUrl(url) {
        if (addSubdomain) {
          let parsedUrl = this.PARSE_REGEX.exec(url);
          let domain = location.protocol + '//' + parsedUrl[2] + '.';
          domain += domainParts.slice(1).join('.') + '/';
          console.log(domain + parsedUrl[3]);
          return domain + parsedUrl[3];
        } else {
          //we are on localhost just add /apps/
          return '/apps/' + url;
        }
      }
    };

  }());

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

