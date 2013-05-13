var Proxy = require(__dirname + '/runner-stream-proxy'),
    Responder = require(__dirname + '/../../test-agent/responder').TestAgent.Responder;

/**
 * @param {Object} options
 * @constructor
 */
function Reporter(options) {
  var key;

  Responder.call(this);

  for (key in options) {
    if (options.hasOwnProperty(key)) {
      this[key] = options[key];
    }
  }

  if (!this.reporterClass) {
    this.reporterClass = require('mocha').reporters[this.defaultMochaReporter];
  }
}

Reporter.prototype = Object.create(Responder.prototype);


Reporter.prototype.defaultMochaReporter = 'Spec';

Reporter.prototype.createRunner = function createRunner() {
  var self = this;
  this.runner = new Responder();
  this.reporter = new this.reporterClass(this.runner);
  this.proxy = new Proxy(this.runner);

  this.runner.on('end', function(){
    self.emit('end', self);
  });
};


/**
 * Returns the mocha reporter used in the proxy.
 *
 *
 * @return {Object} mocha reporter.
 */
Reporter.prototype.getMochaReporter = function getMochaReporter(){
  return this.reporter;
};

/**
 * Reponds to a an event in the form of a json string or an array.
 * This is passed through to the proxy which will format the results
 * and emit an event to the runner which will then comunicate to the
 * reporter.
 *
 * Creates reporter, proxy and runner when recieving the start event.
 *
 * @param {Array | String} line
 */
Reporter.prototype.respond = function respond(line) {
  var data = Responder.parse(line);
  if (data.event === 'start') {
    this.createRunner();
    this.emit('start', this);
  }
  return this.proxy.respond([data.event, data.data]);
};


module.exports = exports = Reporter;
