(function(global, exports) {
  var HAS_BUFFER = typeof Buffer !== 'undefined';

  var SEPARATOR = ':';
  var SEPARATOR_CODE = SEPARATOR.charCodeAt(0);
  var EventEmitter =
    global.EventEmitter2 ||
    require('eventemitter2').EventEmitter2;

  /**
   * First ocurrence of where string occurs in a buffer.
   *
   * NOTE: this is not UTF8 safe generally we expect to find the correct
   * char fairly quickly unless the buffer is incorrectly formatted.
   *
   * @param {Buffer} buffer haystack.
   * @param {String} string needle.
   * @return {Numeric} -1 if not found index otherwise.
   */
  function indexInBuffer(buffer, string) {
    if (typeof buffer === 'string')
      return buffer.indexOf(string);

    if (buffer.length === 0)
      return -1;

    var index = 0;
    var length = buffer.length;

    do {
      if (buffer[index] === SEPARATOR_CODE)
        return index;

    } while (
      ++index && index + 1 < length
    );

    return -1;
  }

  /**
   * Wrapper for creating either a buffer or ArrayBuffer.
   */
  function createByteContainer() {
    if (HAS_BUFFER)
      return new Buffer(0);

    return new Uint8Array();
  }

  /**
   * Join the contents of byte container a and b returning c.
   */
  function concatByteContainers(a, b) {
    if (HAS_BUFFER)
      return Buffer.concat([a, b]);

    // make sure everything is unit8
    if (a instanceof ArrayBuffer)
      a = new Uint8Array(a);

    if (b instanceof ArrayBuffer)
      b = new Uint8Array(b);

    // sizes of originals
    var aLen = a.length;
    var bLen = b.length;

    var array = new Uint8Array(aLen + bLen);
    array.set(a);
    array.set(b, aLen);

    // return new byte container
    return array;
  }

  function sliceByteContainers(container, start, end) {
    start = start || 0;
    end = end || byteLength(container);

    if (HAS_BUFFER)
      return container.slice(start, end);

    return container.subarray(start, end);
  }

  /**
   * Like Buffer.byteLength but works on ArrayBuffers too.
   */
  function byteLength(input) {
    if (typeof input === 'string') {
      if (HAS_BUFFER) {
        return Buffer.byteLength(input);
      }
      var encoder = new TextEncoder();
      var out = encoder.encode(input);
      return out.length;
    }

    return input.length;
  }

  function bytesToUtf8(container, start, end) {
    if (!start)
      start = 0;

    if (!end)
      end = byteLength(container);

    if (HAS_BUFFER)
      return container.toString('utf8', start, end);

    var decoder = new TextDecoder();
    var array = container.subarray(start, end);

    return decoder.decode(array);
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
    var len = byteLength(json);

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
    EventEmitter.call(this);

    this._pendingLength = null;

    // zero length buffer so we can concat later
    // this is always a unit8 array or a buffer.
    this._buffer = createByteContainer();
  }

  Stream.prototype = {
    __proto__: EventEmitter.prototype,

    _findLength: function() {
      if (this._pendingLength === null) {
        var idx = indexInBuffer(this._buffer, SEPARATOR);
        if (idx === -1)
          return;

        // mark the length to read out of the rolling buffer.
        this._pendingLength = parseInt(
          bytesToUtf8(this._buffer, 0, idx),
          10
        );


        this._buffer = sliceByteContainers(this._buffer, idx + 1);
      }
    },

    _readBuffer: function() {
      // if the buffer.length is < then we pendingLength need to buffer
      // more data.
      if (!this._pendingLength || this._buffer.length < this._pendingLength)
        return false;

      // extract remainder and parse json
      var message = sliceByteContainers(this._buffer, 0, this._pendingLength);
      this._buffer = sliceByteContainers(this._buffer, this._pendingLength);
      this._pendingLength = null;

      var result;
      try {
        message = bytesToUtf8(message);
        result = JSON.parse(message);
      } catch (e) {
        this.emit('error', e);
        return false;
      }

      this.emit('data', result);
      return true;
    },

    write: function(buffer) {
      // append new buffer to whatever we have.
      this._buffer = concatByteContainers(this._buffer, buffer);

      do {
        // attempt to find length of next message.
        this._findLength();
      } while (
        // keep repeating while there are messages
        this._readBuffer()
      );
    }
  };

  exports.parse = parse;
  exports.stringify = stringify;
  exports.Stream = Stream;
  exports.separator = SEPARATOR;
}).apply(
  null,
  typeof window === 'undefined' ?
    [global, module.exports] :
    [window, window.jsonWireProtocol = {}]
);

