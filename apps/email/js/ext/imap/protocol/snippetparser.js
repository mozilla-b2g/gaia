define(['./textparser'], function($textparser) {

var TextParser = $textparser.TextParser;

function bufferAppend(buffer1, buffer2) {
  var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
  tmp.set(new Uint8Array(buffer1), 0);
  tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
  return tmp.buffer;
};

/**
 * Wrapper around the textparser, accumulates buffer content and returns it as
 * part of the .complete step.
 */
function SnippetParser(partDef) {
  TextParser.apply(this, arguments);
}

SnippetParser.prototype = {
  parse: function(buffer) {
    if (!this._buffer) {
      this._buffer = buffer;
    } else {
      this._buffer = bufferAppend(this._buffer, buffer);
    }

    // do some magic parsing
    TextParser.prototype.parse.apply(this, arguments);
  },

  complete: function() {
    var content =
      TextParser.prototype.complete.apply(this, arguments);

    content.buffer = this._buffer;
    return content;
  }
};

  return {
    SnippetParser: SnippetParser
  };

});
