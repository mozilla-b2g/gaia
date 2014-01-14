
var Base = require('mocha').reporters.Base;


/**
 * Initialize a new TBPL reporter.
 * @constructor
 * @param {Runner} runner mocha test runner.
 */
function TBPL(runner) {
  Base.call(this, runner);

  runner.on('end', this.onEnd.bind(this));
  runner.on('fail', this.onFail.bind(this));
  runner.on('pass', this.onPass.bind(this));
  runner.on('pending', this.onPending.bind(this));
  runner.on('test', this.onTest.bind(this));
  runner.on('test end', this.onTestEnd.bind(this));

  this.failing = 0;
  this.passing = 0;
  this.pending = 0;
}
module.exports = TBPL;


TBPL.prototype = {
  /**
   * Number of failing tests.
   * @type {number}
   */
  failing: 0,

  /**
   * Number of passing tests.
   * @type {number}
   */
  passing: 0,

  /**
   * Number of pending tests.
   * @type {number}
   */
  pending: 0,

  /**
   * Output a summary of the mocha run.
   */
  onEnd: function() {
    console.log('*~*~* Results *~*~*');
    console.log('passed: %d', this.passing);
    console.log('failed: %d', this.failing);
    console.log('todo: %d', this.pending);
  },

  /**
   * @param {Test} test failing test.
   * @param {Error} err failure.
   */
  onFail: function(test, err) {
    var title = this.getTitle(test);
    console.log('TEST-UNEXPECTED-FAIL | %s', title);
    this.failing += 1;
  },

  /**
   * @param {Test} test passing test.
   */
  onPass: function(test) {
    var title = this.getTitle(test);
    console.log('TEST-PASS | %s', title);
    this.passing += 1;
  },

  /**
   * @param {Test} test pending test.
   */
  onPending: function(test) {
    var title = this.getTitle(test);
    console.log('TEST-PENDING | %s', title);
    this.pending += 1;
  },

  /**
   * @param {Test} test started test.
   */
  onTest: function(test) {
    var title = this.getTitle(test);
    console.log('TEST-START | %s', title);
  },

  /**
   * @param {Test} test finished test.
   */
  onTestEnd: function(test) {
    var title = this.getTitle(test);
    console.log('TEST-END | %s', title);
  },

  /**
   * @param {Test} test some test.
   * @return {string} the title of the test.
   */
  getTitle: function(test) {
    return this.sanitize(test.fullTitle());
  },

  /**
   * @param {string} str some string that could potentially have character
   *     sequences that tbpl would understand.
   * @return {string} sanitized string.
   */
  sanitize: function(str) {
    // These are controversial words and we must censor them!
    return str
        .replace(/PROCESS-CRASH/g, '*************')
        .replace(/TEST-END/g, '********')
        .replace(/TEST-KNOWN-FAIL/g, '***************')
        .replace(/TEST-PASS/g, '*********')
        .replace(/TEST-START/g, '***********')
        .replace(/TEST-UNEXPECTED-FAIL/g, '********************');
  }
};
