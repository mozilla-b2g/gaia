suite('SIGINT', function() {
  var exec = require('child_process').exec;
  var assert = require('assert');

  // Cleanup pid line (works for columns and value lines)
  function splitPidLine(line) {
    return line.trim().replace(/\s+/g, ' ').split(' ');
  }

  // Pretty much what you would expect out of a ps parser.
  function ps(pid, callback) {
    // ppid is important here for the intent of this test but aside from the
    // flags this code is actually could be general purpose.
    exec('ps -o comm -o pid -o ppid', function(err, stdout) {
      if (err) return callback(err);
      var lines = stdout.replace('\r', '').split('\n');
      var columns = splitPidLine(lines.shift());
      var result = [];

      lines.forEach(function(line) {
        var lineParts = splitPidLine(line);
        if (lineParts.length < columns.length) return;
        var obj = {};
        lineParts.forEach(function(part, idx) {
          // lower case to better fit node conventions...
          obj[columns[idx].toLowerCase()] = part;
        });
        result.push(obj);
      });
      callback(null, result);
    });
  }

  // Find all processes which share a starting process parent.
  function recursivePpidSearch(pid, callback) {
    ps(pid, function(err, list) {
      if (err) return callback(err);

      var result = [];

      // Yes this can stack overflow be very careful if this is used elsewhere.
      function findPpid(searchPid) {
        list.forEach(function(item) {
          if (item.ppid == searchPid) {
            findPpid(item.pid);
            result.push(item);
          }
        });
      }

      findPpid(pid);
      return callback(null, result);
    });
  }

  var proc, processList, pid;
  setup(function(done) {
    // Usual process spawning stuff the important bit here is this fixture will
    // fail and never complete unless we wait for 100s or kill the process.
    proc = spawnMarionette([__dirname + '/fixtures/blocked.js']);
    pid = proc.pid;

    // Wait for all the created processes to finish cleanly
    // - b2g process
    // - child _mocha process
    // - proxy reporter process
    var processes = 3;

    function search() {
      recursivePpidSearch(process.pid, function(err, list) {
        if (err) return done(err);
        if (list.length < processes) return setTimeout(search);
        processList = list;
        done();
      });
    }
    search();
  });

  test('closes cleanly on sigint with no left over processes', function(done) {
    proc.kill('SIGINT');
    proc.once('exit', function(code) {
      recursivePpidSearch(pid, function(err, list) {
        if (err) return done(err);
        assert.ok(!list.length, 'all processes have been shut down');
        done();
      });
    });
  });
});

