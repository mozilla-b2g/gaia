var Worker = require('./worker'),
    colors = require('colors'),
    fmt = require('util').format,
    resultColor = require('./result_color');


parallelizer = {
  /**
   * @type {Number}
   */
  passing: 0,

  /**
   * @type {Number}
   */
  pending: 0,

  /**
   * @type {Number}
   */
  failing: 0,

  /**
   * @type {Array.<string>}
   */
  failures: [],

  /**
   * @type {Array.<Worker>}
   */
  workerList: null,

  /**
   * @type {Number}
   */
  completeCount: 0,

  parallelize: function(queue, opts) {
    var workerList = [];
    parallelizer.workerList = workerList;
    for (var i = 0; i < opts.parallel; i++) {
      var worker = new Worker(opts);
      worker.queue = queue;
      worker.on('results', parallelizer.tally);
      worker.on('results', parallelizer.report);
      worker.once('complete', parallelizer.oncomplete);
      workerList.push(worker);
    }

    workerList.forEach(function(worker) {
      worker.work();
    });

    process.stdout.write('\n' + '  ');
  },

  tally: function(event) {
    [
      'passing',
      'pending',
      'failing'
    ].forEach(function(resultType) {
      parallelizer[resultType] += event[resultType];
    });

    parallelizer.failures = parallelizer.failures.concat(event.failures);
  },

  report: function(event) {
    [
      'passing',
      'pending',
      'failing'
    ].forEach(function(resultType) {
      var color = resultColor[resultType];
      process.stdout.write(repeat('.'[color], event[resultType]));
    });
  },

  oncomplete: function(event) {
    if (++parallelizer.completeCount !== parallelizer.workerList.length) {
      return;
    }

    console.log('\n');
    parallelizer.failures.forEach(function(failure) {
      console.error(failure);
    });

    parallelizer.epilogue();
    process.exit(Math.min(1, parallelizer.failures));
  },

  epilogue: function() {
    console.log('\n');
    [
      'passing',
      'pending',
      'failing'
    ].forEach(function(resultType) {
      var output = fmt('  %d %s', parallelizer[resultType], resultType);
      var colored = output[resultColor[resultType]];
      console.log(colored);
    });
  }
};
module.exports = parallelizer;


function repeat(str, n) {
  return new Array(n + 1).join(str);
}
