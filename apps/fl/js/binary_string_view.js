/*
 * BinaryStringView.js: a view class that treats an Array buffer as a binary
 * string and implements String methods for it. Invoke the constructor
 * on an ArrayBuffer, a Uint8Array, or a string.
 */
function BinaryStringView(data) {
  // If the constructor is invoked on a string, assume it is a binary string
  // and copy it into an Array buffer
  if (typeof data === 'string') {
    this.bytes = new Uint8Array(data.length);
    for (var i = 0; i < data.length; i++)
      this.bytes[i] = (data.charCodeAt(i) & 0xFF);
  }
  else if (data instanceof Uint8Array) {
    this.bytes = data;
  }
  else if (data instanceof ArrayBuffer) {
    this.bytes = new Uint8Array(data);
  }
  else {
    throw TypeError();
  }

  this.length = this.bytes.length;
  this.buffer = this.bytes.buffer;
  this.byteOffset = this.bytes.byteOffset;
  this.byteLength = this.bytes.byteLength;
}

BinaryStringView.prototype.toString = function toString() {
  var s = '';
  for (var i = 0; i < this.length; i++)
    s += String.fromCharCode(this.bytes[i]);
  return s;
};

BinaryStringView.prototype.toArrayBuffer = function toArrayBuffer() {
  return this.buffer.slice(this.byteOffset, this.byteOffset + this.byteLength);
};


BinaryStringView.prototype.charAt = function(i) {
  return String.fromCharCode(this.bytes[i]);
};

BinaryStringView.prototype.slice = function slice(from, to) {
  if (to === undefined)
    return new BinaryStringView(this.bytes.subarray(from));
  else
    return new BinaryStringView(this.bytes.subarray(from, to));
};

BinaryStringView.prototype.trim = function() {
  var start = 0, end = this.length - 1;
  var WS = /\s/;
  while (start <= end && WS.test(this.charAt(start)))
    start++;
  while (end >= start && WS.test(this.charAt(end)))
    end--;
  return this.slice(start, end + 1);
};

BinaryStringView.prototype.indexOf = function indexOf(target, start) {
  if (typeof target === 'string')
    target = new BinaryStringView(target);

  start = Math.min(start || 0, this.length);
  if (target.length === 0)
    return start;

  var end = this.length - target.length;

  var i = start;
  while (i <= end) {
    var j = 0;
    while (this.bytes[i + j] === target.bytes[j]) {
      if (++j === target.length)
        return i;
    }
    i++;
  }
  return -1;
};

BinaryStringView.prototype.lastIndexOf = function indexOf(target, start) {
  if (typeof target === 'string')
    target = new BinaryStringView(target);

  if (target.length === 0)
    return Math.min(start || this.length, this.length);

  start = start || this.length - 1;

  var i = start;
  while (i >= 0) {
    var j = 0;
    while (this.bytes[i + j] === target.bytes[j]) {
      if (++j === target.length)
        return i;
    }
    i--;
  }
  return -1;
};
