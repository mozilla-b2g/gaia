var fsPath = require('path');
var env = require('env');

process = window.process = require('process');

var nextTick = process.nextTick;

function MochaBin(mocha, commander) {
  var prefix = __dirname + '/../../vendor/';

  if (typeof(mocha) === 'undefined') {
    importScripts(prefix + 'mocha.js');
    mocha = window.mocha;
    require('mocha-formatting').enhance(mocha);
  }

  if (typeof(commander) === 'undefined') {
    commander = require(prefix + 'commander.js');
  }

  // restore process next tick...
  process.nextTick = nextTick;

  this.mocha = mocha;
  this.commander = commander;
}

MochaBin.prototype = {
  name: 'xpwindow ' + __filename,

  run: function(argv) {
    if (typeof(argv) === 'undefined') {
      argv = process.argv;
    }

    var pwd = env.get('PWD');
    var tests;
    var program = this.commander;
    var mocha = this.mocha;
    var Base = mocha.reporters.Base;

    program
      .usage('[options] [files]')
      .option('-R, --reporter <name>', 'specify the reporter to use', 'Dot')
      .option('-u, --ui <name>', 'specify user-interface (bdd|tdd|exports)', 'bdd')
      .option('-t, --timeout <ms>', 'set test-case timeout in milliseconds [2000]')
      .option('-s, --slow <ms>', '"slow" test threshold in milliseconds [75]', parseInt)
      .option('-c, --colors', 'force enabling of colors')
      .option('-C, --no-colors', 'force disabling of colors')

    program.name = this.name;
    program.parse(process.argv);

    // --no-colors

    if (!program.colors) Base.useColors = false;

    // --colors

    if (~process.argv.indexOf('--colors') ||
        ~process.argv.indexOf('-c')) {
      Base.useColors = true;
    }

    // --slow <ms>

    if (program.slow) Base.slow = program.slow;

    // --timeout

    if (program.timeout) mocha.suite.timeout(program.timeout);

    mocha.setup({
      ui: program.ui,
      reporter: mocha.reporters[program.reporter]
    });

    if (this.commander.args) {
      tests = this.commander.args.forEach(function(file) {
        if (file[0] !== '/') {
          file = fsPath.resolve(pwd, file);
        }
        require(file);
      });
    }

    mocha.run(function() {
      window.xpcEventLoop.stop();
    });

    window.xpcEventLoop.start();
  }

};

module.exports.MochaBin = MochaBin;
