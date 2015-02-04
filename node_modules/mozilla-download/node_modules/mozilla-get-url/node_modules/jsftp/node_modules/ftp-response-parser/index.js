var util = require('util')
var stream = require('stream');

// Support for Node 0.8 users
if (!stream.Transform) {
  stream = require('readable-stream');
}

var RE_RES = /^(\d\d\d)\s(.*)/;
var RE_MULTI = /^(\d\d\d)-/;

// Codes from 100 to 200 are FTP marks
function isMark(code) {
  code = parseInt(code, 10);
  return code > 100 && code < 200;
}

function ResponseParser() {
  this.currentCode = 0;
  this.buffer = [];

  stream.Transform.call(this, {
    objectMode: true
  });
}

util.inherits(ResponseParser, stream.Transform);

ResponseParser.prototype._transform = function(chunk, encoding, done) {
  var data = chunk.toString();
  if (this._lastChunk) {
    data = this._lastChunk + data;
    this._lastChunk = '';
  }

  var lines = data.split(/\r?\n/);

  // Check if last line contained a '\n' or was truncated, in which case we store
  // it away to add it when a new write happens
  if (lines && lines.length && lines[lines.length - 1] !== '') {
    this._lastChunk = lines.pop();
  }

  lines = lines.filter(function(l) {
    return !!l;
  });

  lines.forEach(function(line) {
    var simpleRes = RE_RES.exec(line);
    var multiRes;

    if (simpleRes) {
      var code = parseInt(simpleRes[1], 10);

      if (this.buffer.length) {
        this.buffer.push(line);

        if (this.currentCode === code) {
          line = this.buffer.join('\n');
          this.buffer = [];
          this.currentCode = 0;
        }
      }

      this.push({
        code: code,
        text: line,
        isMark: isMark(code),

        // In FTP every response code above 399 means error in some way.
        // Since the RFC is not respected by many servers, we are going to
        // overgeneralize and consider every value above 399 as an error.
        isError: code > 399
      });
    } else {
      if (!this.buffer.length && (multiRes = RE_MULTI.exec(line))) {
        this.currentCode = parseInt(multiRes[1], 10);
      }
      this.buffer.push(line.toString());
    }
  }, this);

  done();
};

module.exports = ResponseParser;
