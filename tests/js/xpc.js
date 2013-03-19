(function(window) {
  window.mozTestInfo = {appPath: window.xpcArgv[2]};
  const excludedApps = [
    'bluetooth', 'keyboard', 'wallpaper', // no generic way to test yet
    'communications/facebook', 'communications/gmail', // part of other apps
    'communications/import', 'communications/live', // part of other apps
    'communications', // not an app
    'homescreen', // we can't "launch" it
    'system', // reboots the phone
    'system/camera', // copy of the camera app
  ];

  var env = window.xpcModule.require('env');
  if (excludedApps.indexOf(window.mozTestInfo.appPath) !== -1) {
    if (env.get('VERBOSE')) {
      console.log("'" + window.mozTestInfo.appPath + "' is an excluded app, skipping tests.");
    }

    var output = {};
    output.stats = {application: window.mozTestInfo.appPath,
                    suites: 0};
    console.log(JSON.stringify(output));
    return;
  }

  window.parent = window;
  window.location.host = 'localhost';
  window.Date = Date;

  var seenModule = {};
  var path = window.xpcModule.require('path');

  window.require = function(url, cb) {

    if (url.lastIndexOf('/common', 0) === 0) {
      // required so we can load the unit test helper.js
      url = '../../test_apps/test-agent' + url;
    } else if (url.lastIndexOf('apps/', 0) === 0 ||
               url.lastIndexOf('tests/', 0) === 0 ||
               url.lastIndexOf('/', 0) === 0) {
      // required for loading of test files
      url = '../../' + url;
    }

    url = path.resolve(url);

    if (!(url in seenModule)) {
      seenModule[url] = true;
      importScripts(url);
    }

    if (typeof(cb) === 'function') {
      cb();
    }
  };

  Common = window.CommonResourceLoader = {
    url: function(url) {
      return url;
    }
  };


  require('/test_apps/test-agent/common/vendor/mocha/mocha.js');
  require('/tests/reporters/jsonmoztest.js');
  require('/tests/reporters/jsonmozperf.js');
  Mocha.reporters.JSONMozTest = JSONMozTestReporter;
  process.stdout.write = window.xpcDump;

  //Hack to format errors
  Mocha.reporters.Base.list = function(failures) {
    failures.forEach(function(test, i) {
      // format
      var fmt = this.color('error title', '  %s) %s:\n') +
          this.color('error message', '     %s') +
          this.color('error stack', '\n%s\n');

      // msg
      var err = test.err,
          message = err.message || '',
          stack = window.xpcError.format(err),
          index = stack.indexOf(message) + message.length,
          msg = stack.slice(0, index),
          actual = err.actual,
          expected = err.expected;

      // actual / expected diff
      if ('string' == typeof actual && 'string' == typeof expected) {
        var len = Math.max(actual.length, expected.length);

        if (len < 20) msg = errorDiff(err, 'Chars');
        else msg = errorDiff(err, 'Words');

        // linenos
        var lines = msg.split('\n');
        if (lines.length > 4) {
          var width = String(lines.length).length;
          msg = lines.map(function(str, i) {
            return pad(++i, width) + ' |' + ' ' + str;
          }).join('\n');
        }

        msg = [
          '\n', this.color('diff removed', 'actual'),
          ' ', this.color('diff added', 'expected'),
          '\n\n',
          msg,
          '\n'
        ].join('');

        // indent
        msg = msg.replace(/^/gm, '      ');

        fmt = this.color('error title', '  %s) %s:\n%s') +
              this.color('error stack', '\n%s\n');
      }

      // indent stack trace without msg
      stack = stack.slice(index ? index + 1 : index)
        .replace(/^/gm, '  ');

      console.error(fmt, (i + 1), test.fullTitle(), msg, stack);
    }.bind(this));

  };


  var reporter = env.get('REPORTER') || 'Spec';

  if (!(reporter in Mocha.reporters)) {
    var reporters = Object.keys(Mocha.reporters);
    var idx = reporters.indexOf('Base');

    if (idx !== -1) {
      reporters.splice(idx, 1);
    }

    var allowed = reporters.join(',\t\n');
    console.log('Error running integration tests:\n');

    console.log(
      'Invalid REPORTER "' + reporter + '" set use one of:\n' +
      allowed
    );

  } else {
    mocha.setup({
      ui: 'tdd',
      reporter: Mocha.reporters[reporter],
      // change the default timeout to all tests to 6 seconds
      timeout: 20000
    });

    window.mozTestInfo.runs = env.get('RUNS') || 5;
    window.xpcArgv.slice(3).forEach(function(test) {
      require(test);
    });

    mocha.run(function() {
      window.xpcEventLoop.stop();
    });

    window.xpcEventLoop.start();
  }

}(this));
