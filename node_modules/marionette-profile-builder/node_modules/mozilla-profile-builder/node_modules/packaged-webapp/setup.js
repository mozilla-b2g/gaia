var host = require('marionette-host-environment');
console.log('-*--*- Priming host environemnt ----');
host.spawn(__dirname + '/test/b2g/', function(err, port, child) {
  if (err) return callback(err);
  child.kill();
});

