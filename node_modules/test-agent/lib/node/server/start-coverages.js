/**
 * REQUIRES: responder, broadcast
 *
 * When server recieves siginal to start coverages
 * will tell every client to generate coverage report.
 * If no clients are connected, will wait for a connect
 * event before broadcasting the start coverages signal
 */

var QueueTests = require('./queue-tests');

function StartCoverages() {
  QueueTests.call(this);
}

StartCoverages.prototype = Object.create(QueueTests.prototype);

StartCoverages.prototype.constructor = StartCoverages;

StartCoverages.prototype.eventNames = {
  connect: 'worker ready',
  start: 'start coverages',
  sendEvent: 'run tests with coverage'
};

module.exports = exports = StartCoverages;
