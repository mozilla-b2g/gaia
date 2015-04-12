'use strict';

/* global Process */

requireApp('system/lockscreen/js/stream/process.js');

suite('Process > ', function() {
  test(`Could execute guest Process with Promise in
    host Process correctly`, function(done) {
    var host = new Process();
    host.start()
      .next(() => { return 'foo'; })
      .next((stepResult) => {
        var guest = new Process();
        return guest.start().next(() => {
          return Promise.resolve().then(() => {
            return stepResult + 'bar';
          });
        });
      })
      .next((finalResult) => {
        assert.equal(finalResult, 'foobar');
      })
      .next(done)
      .rescue(done);
  });
  test(`Would execute steps until it get shifted`, function(done) {
    var process = new Process();
    process
      .start()
      .next(() => {
        return Promise.resolve().then(() => {
          process.stop().next(done)
            .rescue((e) => {
              done(e || 'fail');
            });
        });
      })
      .next(() => {
        done('fail');
      });
  });

  test(`It's fine to handle multiple tasks`, function(done) {
    var number = 0;
    var process = new Process();
    var task1 = (new Process())
      .start()
      .next(() => {
        number += 1;
        return Promise.resolve();
      });
    var task2 = (new Process())
      .start()
      .next(() => {
        number += 1;
        // This line would stuck the test, since it
        // would never been resolved (as we expect
        // what the 'all' method should do).
        //return new Promise(() => {});
        return Promise.resolve();
      });

    process
      .start()
      .wait(() => task2, () => task1)
      .next(() => {
        assert.equal(number, 2,
          `the tasks had not been executed correctly`);
      })
      .next(done)
      .rescue(done);
  });
});
