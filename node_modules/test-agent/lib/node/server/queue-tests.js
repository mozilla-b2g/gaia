/**
 * REQUIRES: suite, responder, broadcast
 *
 * When server recieves siginal to start tests
 * will tell every client to run all or some tests.
 * If no clients are connected, will wait for a connect
 * event before broadcasting the run tests signal
 */
function StartTests() {
  this.clientReady = false;
  this.testQueue = [];
}

StartTests.prototype = {

  eventNames: {
    connect: 'worker ready',
    start: 'queue tests',
    sendEvent: 'run tests'
  },

  enhance: function (server) {
    server.on(this.eventNames.connect, this._onWorkerReady.bind(this, server));
    server.on(this.eventNames.start, this._startTests.bind(this, server));
  },

  _onWorkerReady: function (server) {
    this.clientReady = true;
    var testData = null;
    // run any tests that have already been queued
    while (this.testQueue.length > 0) {
      testData = this.testQueue.shift();
      this._startTests(server, testData);
    }
  },

  _startTests: function (server, data) {
    data = data || {};
    var totalChunks = data.totalChunks || 1;
    var thisChunk = data.thisChunk || 1;

    // if there are no clients connected
    // simply store the test data for now
    if (!this.clientReady) {
      this.testQueue.push(data);
      return;
    }

    if (data.files && data.files.length > 0) {
      this._broadCastFiles(server, data.files, totalChunks, thisChunk);
    } else {
      server.suite.findTestFiles(function(err, files) {
        this._broadCastFiles(server, files, totalChunks, thisChunk);
      }.bind(this));
    }
  },

  /**
  Tell the clients to run a particular set of tests this function also handles
  chunking logic.
  */
  _broadCastFiles: function (server, files, totalChunks, thisChunk) {
    // Generate a sorted list of files...
    var list = files.map(function(file) {
      var result = server.suite.testFromPath(file);
      return result.testUrl;
    }).sort();

    // Chunking logic this allows running a subset of tests...
    var chunkLength = Math.ceil(list.length / totalChunks);
    var chunk = (thisChunk - 1) * chunkLength;
    list = list.slice(chunk, chunk + chunkLength);
    console.log('Running tests: ', list);

    server.broadcast(server.stringify(this.eventNames.sendEvent, {tests: list}));
  }

};

module.exports = exports = StartTests;
