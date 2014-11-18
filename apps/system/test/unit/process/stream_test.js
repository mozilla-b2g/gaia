'use strict';

/* global Process, Stream */


/**
 * Since Stream is just wrapping Process, so we could test both of them
 * at the same time.
 **/
requireApp('system/lockscreen/js/process/process.js');
requireApp('system/lockscreen/js/process/stream.js');

suite('Stream > ', function() {
  test(`stream would only handle events after it's ready,
        and after the process get stopped, there is no handling anymore`,
  function(done) {
    var base = 0;
    var mockHandler = function() {
      base ++;
    };
    var stream = new Stream();
    var process = new Process();
    // Must start the process before handle the events.
    process.start().then(function() {
      stream.start(process).handler(mockHandler).events([]).ready();
      stream.handleEvent({});
      process.then(function() {
        assert.equal(1, base,
          `after stream ready, it should do something`);
      }).then(function() {
        process.stop().then(function() {
          stream.handleEvent({});
          process.then(function() {
            assert.equal(1, base,
              `after process stopped, it should do nothing`);
            done();
          });
        }).catch(done);
      });
    }).catch(done);
  });

});
