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
    mochaUrl: CommonResourceLoader.url('/common/vendor/mocha/mocha.js'),
    /* path to your test helper this is required, but it can be a blank file if you like */
    testHelperUrl: './helper.js'
  });

  worker.use(TestAgent.BrowserWorker.TestUi);

  worker.addTestsProcessor(function(tests){
    var domain = window.location.host.split('.'),
        checkDomain = false;

    if(domain.length > 1){
      checkDomain = true;
      domain = '/' + domain[0];
    }

    if(!checkDomain){
      return tests;
    }

    return tests.map(function(item){
      if(/^\/test\//.test(item)){
        return item;
      } else {
        if(item.indexOf(domain) === 0){
          return item.replace(domain, '');
        }
      }
    });
  });

  worker.on({

    'sandbox': function() {
      /* Load your fav assertion engine */
      /* expect.js
      worker.loader.require('https://raw.github.com/LearnBoost/expect.js/master/expect.js');      
      */
    },

    'run tests': function(){
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

