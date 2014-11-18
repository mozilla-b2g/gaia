'use strict';

/* global Process */

requireApp('system/lockscreen/js/process/process.js');

suite('Process > ', function() {
  suite('control methods > ', function() {
    test(`no startng if it's already stopped or destroyed`, function() {
      var method = Process.prototype.start;
      var mockThis = {
        status: {
          stopped: true,
          destroyed: true,
          started: false
        }
      };
      method.call(mockThis);
      assert.isFalse(mockThis.status.started,
        `The flag still been set even even it's stopped || destroyed`);
    });

    test(`no stopping if it's already started and destroyed`, function() {
      var method = Process.prototype.stop;
      var mockThis = {
        status: {
          stopped: false,
          destroyed: true,
          started: true
        }
      };
      method.call(mockThis);
      assert.isFalse(mockThis.status.stopped,
        `The flag still been set even even it\'s started & destroyed`);
    });

    test(`no stopping if it wasn't started`, function() {
      var method = Process.prototype.stop;
      var mockThis = {
        status: {
          stopped: false,
          destroyed: false,
          started: false
        }
      };
      method.call(mockThis);
      assert.isFalse(mockThis.status.stopped,
        `The flag still been set even even it wasn't started`);
    });

    test(`no destroying if it wasn't started`, function() {
      var method = Process.prototype.destroy;
      var mockThis = {
        status: {
          stopped: false,
          destroyed: false,
          started: false
        }
      };
      method.call(mockThis);
      assert.isFalse(mockThis.status.destroyed,
        `The flag still been set even even it wasn't started`);
    });
  });

  suite('process control > ', function() {
    test(`can execute until the next step`, function(done) {
      var base = 0;
      var process = new Process();
      process.start()
        .then(function() { base ++; })
        .then(function() { base ++; })
        .then(function() {
          assert.equal(2, base,
            `the steps doesn't change the value`);
        })
        .then(done)
        .catch(done);
    });

    test(`can execute and turn to destroyed phase`, function(done) {
      var base = 0;
      var process = new Process();
      process.start()
        .then(function() { base ++; })
        .then(function() { base ++; })
        .catch(done);
      process.stop()
        .then(function() { base ++; })
        .then(function() { base ++; })
        .then(function() { base ++; })
        .catch(done);
      process.destroy()
        .then(function() { base --; })
        .then(function() { base --; })
        .then(function() {
          assert.equal(-2, base,
            `the 'start' and 'stop' phases would not be executed, because
             the 'destroy' would be called immediately after the two functions,
             and switch the phase to it immediately.`);
        })
        .then(done)
        .catch(done);
    });

    test(`can execute and turn to destroyed phase`, function(done) {
      var base = 0;
      var process = new Process();
      var phases = Promise.resolve();
      phases.then(function() {
        return new Promise(function(resolve) {
          process.start()
            .then(function() { base ++; })
            .then(function() { base ++; })
            .then(resolve)
            .catch(done);
        });
      }).then(function() {
        return new Promise(function(resolve) {
          process.stop()
            .then(function() { base ++; })
            .then(function() { base ++; })
            .then(function() { base ++; })
            .then(resolve)
            .catch(done);
        });
      }).then(function() {
        return new Promise(function(resolve) {
          process.destroy()
            .then(function() { base --; })
            .then(function() { base --; })
            .then(function() {
              assert.equal(3, base,
                `these three phases would be executed because the switching
                 functions were not called hurriedly.`);
            })
            .then(resolve)
            .then(done)
            .catch(done);
        });
      });
    });

  });
});
