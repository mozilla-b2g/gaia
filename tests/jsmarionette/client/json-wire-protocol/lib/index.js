var Transform = require('stream').Transform;

var SEPARATOR = ':';
var SEPARATOR_CODE = SEPARATOR.charCodeAt(0);

/**
 * First ocurrence of where string occurs in a buffer.
 *
 * NOTE: this is not UTF8 safe generally we expect to find the correct
 * char fairly quickly unless the buffer is incorrectly formatted.
 *
 * @param {Buffer} buffer haystack.
 * @param {String} code needle.
 * @return {Numeric} -1 if not found index otherwise.
 */
function indexInBuffer(buffer, code) {
  if (buffer.length === 0)
    return -1;

  var index = 0;
  var length = buffer.length;

  do {
    if (buffer[index] === code) return index;
  } while (
    ++index && index + 1 < length
  );

  return -1;
}

/**
 * converts an object to a string representation suitable for storage on disk.
 * Its very important to note that the length in the string refers to the utf8
 * size of the json content in bytes (as utf8) not the JS string length.
 *
 * @param {Object} object to stringify.
 * @return {String} serialized object.
 */
function stringify(object) {
  var json = JSON.stringify(object);
  var len = Buffer.byteLength(json);

  return len + SEPARATOR + json;
}

/**
 * attempts to parse a given buffer or string.
 *
 * @param {Uint8Array|Buffer} input in byteLength:{json..} format.
 * @return {Objec} JS object.
 */
function parse(input) {
  var stream = new Stream();
  var result;

  stream.once('data', function(data) {
    result = data;
  });

  stream.write(input);

  if (!result) {
    throw new Error(
      'no command available from parsing:' + input
    );
  }

  return result;
}

function Stream() {
  this._pendingLength = null;
  this._buffer = new Buffer(0);

  Transform.call(this, { objectMode: true });
}

Stream.prototype = {
  __proto__: Transform.prototype,

  _transform: function(chunk, encoding, cb) {
    if (!this._pendingLength) {
      var idx = indexInBuffer(chunk, SEPARATOR_CODE)

      // Nothing to do just buffer it...
      if (idx === -1) {
        this._buffer = Buffer.concat([this._buffer, chunk]);
        return cb();
      }

      // number of bytes in the json segment...
      var length = Buffer.concat([this._buffer, chunk.slice(0, idx)]);
      this._pendingLength = parseInt(length.toString(), 10);
      this._buffer = new Buffer(0);

      // We have transitioned to a pending length state so do another pass.
      return this._transform(chunk.slice(idx + 1), encoding, cb);
    }

    // Total length too small nothing to do...
    if (this._buffer.length + chunk.length < this._pendingLength) {
      this._buffer = Buffer.concat([this._buffer, chunk]);
      return cb();
    }

    var buffer = Buffer.concat([this._buffer, chunk]);
    var remainder = null;

    if (buffer.length > this._pendingLength) {
      remainder = buffer.slice(this._pendingLength);
      buffer = buffer.slice(0, this._pendingLength);
    }

    // Reset internal state and push current json string.
    this._pendingLength = null;
    this._buffer = new Buffer(0);
    this.push(JSON.parse(buffer.toString()))

    // If we have any remaining data we need to keep processing...
    if (remainder) {
      return this._transform(remainder, encoding, cb);
    }

    // Otherwise we are done yay....
    return cb();
  }

};

exports.parse = parse;
exports.stringify = stringify;
exports.Stream = Stream;
exports.separator = SEPARATOR;
