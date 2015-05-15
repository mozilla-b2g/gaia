'use strict';
var Base = require('mocha').reporters.Base;
var fsPath = require('path');

/**
 * Initialize a new TBPL reporter.
 * @constructor
 * @param {Runner} runner mocha test runner.
 */
function TBPL(runner) {
  Base.call(this, runner);

  this.onEnd = this.onEnd.bind(this);
  runner.on('end', this.onEnd);
  this.onFail = this.onFail.bind(this);
  runner.on('fail', this.onFail);
  this.onPass = this.onPass.bind(this);
  runner.on('pass', this.onPass);
  this.onPending = this.onPending.bind(this);
  runner.on('pending', this.onPending);
  this.onTest = this.onTest.bind(this);
  runner.on('test', this.onTest);
  this.onTestEnd = this.onTestEnd.bind(this);
  runner.on('test end', this.onTestEnd);

  this.failing = 0;
  this.passing = 0;
  this.pending = 0;
}
module.exports = TBPL;


TBPL.prototype = {
  __proto__: Base.prototype,

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
    this.epilogue();
  },

  /**
   * @param {Test} test failing test.
   * @param {Error} err failure.
   */
  onFail: function(test, err) {
    var title = this.getTitle(test),
        file = this.getFile(test);
    console.log('TEST-UNEXPECTED-FAIL | %s | %s', file, title);
    console.log(err.stack);
    this.failing += 1;
  },

  /**
   * @param {Test} test passing test.
   */
  onPass: function(test) {
    var title = this.getTitle(test),
        file = this.getFile(test);
    console.log('TEST-PASS | %s | %s', file, title);
    this.passing += 1;
  },

  /**
   * @param {Test} test pending test.
   */
  onPending: function(test) {
    var title = this.getTitle(test),
        file = this.getFile(test);
    console.log('TEST-PENDING | %s | %s', file, title);
    this.pending += 1;
  },

  /**
   * @param {Test} test started test.
   */
  onTest: function(test) {
    var title = this.getTitle(test),
        file = this.getFile(test);
    console.log('TEST-START | %s | %s', file, title);
  },

  /**
   * @param {Test} test finished test.
   */
  onTestEnd: function(test) {
    var title = this.getTitle(test),
        file = this.getFile(test);
    console.log('TEST-END | %s | %s took %d ms', file, title, test.duration);
  },

  /**
   * @param {Test} test some test.
   * @return {string} the title of the test.
   */
  getTitle: function(test) {
    return this.sanitize(test.fullTitle());
  },

  getFile: function(test) {
    var file = null;
    if ('file' in test) {
      file = test.file;
    }

    if ('parent' in test) {
      var tmpfile = this.getFile(test.parent);
      if (tmpfile) {
        file = tmpfile;
      }
    }

    // Make the file relative if we have one...
    if (file) {
      // Resolve ensures we never end up with two trailing slashes...
      var pwd = fsPath.resolve(process.cwd()) + '/';
      // Make sure the file starts with pwd before replacing it.
      if (file.indexOf(pwd) === 0) {
        file = file.replace(pwd, '');
      }
    }

    return file;
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
