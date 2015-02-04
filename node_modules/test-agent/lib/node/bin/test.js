var Client = require('../../node/client'),
    Apps = require('../../node/server'),
    optimist = require('optimist'),
    argv,
    reporters,
    reporterList,
    mochaOptions,
    client = new Client({
      retry: true
    });

/* ## On Reporters ##
 *
 * test-agent initially used the CamelCase reporter class names as mapped by the
 * mocha.reporters(.index) module.  So mocha.reporters.dot got exposed as 'Dot',
 * mocha.reporters.tap as 'TAP', etc.  This, however, was inconsistent with
 * mocha.reporter() which uses a require()/module-named based approach.
 *
 * For backwards-compatibility and so that reporterList() doesn't have to use
 * 'fs' to enumerate the modules, we still support the CamelCase approach, but
 * we failover to the require-based mechanism.  If you are among the few, the
 * elite to read this exciting comment, then know that you should use lower-case
 * module-names.
 */
reporters = require('mocha').reporters;

function reporterList(){
  var base,
      list;

  list = Object.keys(reporters);
  base = list.indexOf('Base');
  if(base !== -1){
    list.splice(base, 1);
  }
  return list.join(', ');
}

argv = optimist.
  usage([
    'Executes tests in all available clients. ',
    'Defaults to running all tests.\n\n',
    'js-test-agent test [file, ...]'
  ].join('')).
  option('reporter', {
    desc: 'Mocha reporters available: [' + reporterList() + ']',
    // Leaving the default in CamelCase since it does avoid a require() call
    default: 'Spec'
  }).
  option('coverage', {
    desc: 'Blanket coverage report'
  }).
  option('server', {
    desc: 'Location of the websocket server to connect to.',
    default: 'ws://localhost:8789'
  }).
  option('event-timeout', {
    desc: 'Sets the timeout for the wait-for-event must be used with wait-for-event'
  }).
  option('wait-for-event', {
    desc: 'Event to wait for if event is not fied in "event-timeout" server will exit'
  }).
  option('this-chunk', {
    desc: 'Current chunk number to run',
    default: 1
  }).
  option('total-chunks', {
    desc: 'Total number of chunks to run',
    default: 1
  }).
  argv;

if (argv.help) {
  optimist.showHelp();
  process.exit(0);
}

var reporterClass = reporters[argv.reporter];
if (!reporterClass) {
  try {
    reporterClass = require('mocha/lib/reporters/' + argv.reporter);
  } catch (err) {
    reporterClass = require(argv.reporter);
  }
  if (!reporterClass) {
    console.error('ERROR: Invalid Reporter\n');
    optimist.showHelp();
    process.exit(1);
  }
}

var enableCoverage = argv.coverage || false;

client.url = argv.server;

client.on('open', function(socket) {
  var files = argv._.slice(1),
      fsPath = require('path'),
      launchEvent = enableCoverage ? 'start coverages' : 'queue tests';

  files = files.map(function(file) {
    file = fsPath.normalize(file);
    if (file[0] !== '/') {
      file = fsPath.join(process.env.PWD, file);
    }
    return file;
  });

  client.mirrorServerEvents([
    'set test envs',
    'error',
    'test data',
    'coverage report'
  ], true);

  client.send(launchEvent, {
    files: files,
    thisChunk: argv['this-chunk'],
    totalChunks: argv['total-chunks']
  });
});

mochaOptions = {
  reporterClass: reporterClass,
  coverage: enableCoverage
};

if (enableCoverage) {
  client.use(Apps.BlanketConsoleReporter);
}

client.use(Apps.MochaTestEvents, mochaOptions);

if(argv['wait-for-event'] && argv['event-timeout']) {
  client.use(Apps.EventOrTimeout, {
    event: argv['wait-for-event'],
    timeout: parseInt(argv['event-timeout'])
  });
}

client.on('test runner end', function(runner){
  var reporter = runner.getMochaReporter();
  client.send('close');
  if(reporter.failures == 0){
    process.exit(0);
  }
  process.exit(1);
});

client.start();
