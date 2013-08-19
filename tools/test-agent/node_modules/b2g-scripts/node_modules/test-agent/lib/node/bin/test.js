var Client = require('../../node/client'),
    Apps = require('../../node/server'),
    optimist = require('optimist'),
    argv,
    reporters,
    reporterList,
    client = new Client({
      retry: true
    });

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
    default: 'Spec'
  }).
  option('server', {
    desc: 'Location of the websocket server to connect to.',
    default: 'ws://localhost:8789'
  }).
  argv;

if (argv.help) {
  optimist.showHelp();
  process.exit(0);
}

if(!reporters[argv.reporter]){
  console.error('ERROR: Invalid Reporter\n');
  optimist.showHelp();
  process.exit(1);
}

client.url = argv.server;

client.on('open', function(socket) {
  var files = argv._.slice(1),
      fsPath = require('path');

  files = files.map(function(file) {
    file = fsPath.normalize(file);
    if (file[0] !== '/') {
      file = fsPath.join(process.env.PWD, file);
    }
    return file;
  });

  client.mirrorServerEvents(['set test envs', 'error', 'test data'], true);
  client.send('queue tests', {files: files});
});

client.use(Apps.MochaTestEvents, {
  reporterClass: reporters[argv.reporter]
});


client.on('test runner end', function(runner){
  var reporter = runner.getMochaReporter();
  client.send('close');
  if(reporter.failures == 0){
    process.exit(0);
  }
  process.exit(1);
});

client.start();
