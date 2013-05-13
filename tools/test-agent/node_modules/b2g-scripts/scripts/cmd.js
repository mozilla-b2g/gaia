var cmd = require('../lib/script')({
  desc: 'Runs a marionette command',
  usage: 'cmd <command> [args...] [args...]'
}, function(argv) {
  var args = argv._.slice(1),
      method = args.shift(),
      driver = require('../lib/driver')();

  if (!method) {
    console.error('You must provide a marionette command');
    this.help(1);
  }

  driver.start(function(client) {
    client.defaultCallback = function(value) {
      console.log(method, 'output:', value);
    }

    client[method].apply(client, args);

    driver.stop();
  });
});

module.exports = cmd;
