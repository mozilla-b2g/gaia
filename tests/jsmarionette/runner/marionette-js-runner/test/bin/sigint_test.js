/* global spawnMarionette */
'use strict';
suite('SIGINT', function() {
  var exec = require('child_process').exec;
  var assert = require('assert');

  // Cleanup pid line (works for columns and value lines)
  function splitPidLine(line) {
    return line.trim().replace(/\s+/g, ' ').split(' ');
  }

  // Pretty much what you would expect out of a ps parser.
  function ps(callback) {
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
          if (!columns[idx]) {
            return;
          }

          obj[columns[idx].toLowerCase()] = part;
        });
        result.push(obj);
      });
      callback(null, result);
    });
  }

  // Find all processes which share a starting process parent.
  function recursivePpidSearch(pid, callback) {
    ps(function(err, list) {
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

  function ensureKill(testFile, waitTime) {
    suite('SIGKILL ' + testFile + ' after ' + waitTime + ' ms', function() {
      var proc, processList, pid;
      setup(function(done) {
        // Usual process spawning stuff the important bit here is this fixture
        // will fail and never complete unless we wait for 100s or kill the
        // process.
        proc = spawnMarionette([testFile]);
        proc.stdout.pipe(process.stdout);
        proc.stderr.pipe(process.stderr);
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
            setTimeout(done, waitTime);
          });
        }
        search();
      });

      test('cleanly sigkill with no leftovers', function(done) {
        proc.kill('SIGINT');
        proc.once('exit', function(code) {
          ps(function(err, currentProcesses) {
            if (err) return done(err);
            var remaining = processList.filter(function(startProc) {
              for (var i = 0; i < currentProcesses.length; i++) {
                if (currentProcesses[i].pid == startProc.pid) return true;
              }
              return false;
            });
            assert(
              !remaining.length,
              'Process still running: ' + JSON.stringify(remaining)
            );
            done();
          });
        });
      });
    });
  }

  // Basically instantly.
  ensureKill(__dirname + '/../integration/multiclient_test', 10);
  // Very early in the startup.
  ensureKill(__dirname + '/../integration/multiclient_test', 100);
  // Sessions are probably being created.
  ensureKill(__dirname + '/../integration/multiclient_test', 500);
  // Marionette is blocked.
  ensureKill(__dirname + '/fixtures/blocked', 500);
});

