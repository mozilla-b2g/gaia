/*(The MIT License)

Copyright (c) 20011-2012 TJ Holowaychuk <tj@vision-media.ca>

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

(function(window) {
  'use strict';

  if (typeof(window.TestAgent) === 'undefined') {
    window.TestAgent = {};
  }

  if (typeof(window.TestAgent.Mocha) === 'undefined') {
    window.TestAgent.Mocha = {};
  }


  Base.slow = 75;

  //Credit: mocha -
  //https://github.com/visionmedia/mocha/blob/master/lib/reporters/base.js#L194
  function Base(runner) {
    var self = this
      , stats = this.stats = { suites: 0, tests: 0, passes: 0, pending: 0, failures: 0 }
      , failures = this.failures = [];

    if (!runner) return;
    this.runner = runner;

    runner.stats = stats;

    runner.on('start', function(){
      stats.start = new Date;
    });

    runner.on('suite', function(suite){
      stats.suites = stats.suites || 0;
      suite.root || stats.suites++;
    });

    runner.on('test end', function(test){
      stats.tests = stats.tests || 0;
      stats.tests++;
    });

    runner.on('pass', function(test){
      stats.passes = stats.passes || 0;

      var medium = test.slow() / 2;
      test.speed = test.duration > test.slow()
        ? 'slow'
        : test.duration > medium
          ? 'medium'
          : 'fast';

      stats.passes++;
    });

    runner.on('fail', function(test, err){
      stats.failures = stats.failures || 0;
      stats.failures++;
      test.err = err;
      failures.push(test);
    });

    runner.on('end', function(){
      stats.end = new Date;
      stats.duration = new Date - stats.start;
    });

    runner.on('pending', function(){
      stats.pending++;
    });
  }

  window.TestAgent.Mocha.ReporterBase = Base;

}(this));
