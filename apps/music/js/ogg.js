/*jshint curly:true, latedef:true, undef:true, browser:true, devel:true, loopfunc:true */
/**
 * OGG format implementation in js.
 */

var debug = false;

var Util = {
  compareArray : function(lhs, rhs) {
    if (lhs.length != rhs.length) {
      return false;
    }
    for(var i = 0; i < lhs.length; i++) {
      if (lhs[i] != rhs[i]) {
        return false;
      }
    }
    return true;
  },
  asciiArrayToString : function(array) {
    var str = "";
    for (var i = 0; i < array.length; i++) {
      str += String.fromCharCode(array[i]);
    }
    return str;
  },
  add_trace : function(message, ok) {
    if (debug) {
      var t = document.querySelector("ul#trace");
      var li = document.createElement('li');
      li.innerHTML = message;
      li.className = ok ? "ok" : "ko";
      t.appendChild(li);
    }
  },
  assert : function(predicate, msg, offset, begin, end) {
    if (predicate) {
      Util.add_trace(msg, true);
    } else {
      Util.add_trace(msg, false);
    }
  },

  get : function(blob, type, begin, end, callback) {
    var file = new FileReader(),
    part = blob.slice(begin, end);

    file.onloadend = function() {
      callback(undefined, file.result);
    };
    file.onerror = function(e) {
      callback("Error decoding blob into " + type + " from " + begin + " to " + end,
               undefined);
    };

    switch(type) {
      case "ascii":
        file.readAsBinaryString(part);
      break;
      case "utf-8":
        file.readAsText(part, "utf-8");
      break;
      case "binary":
        file.readAsArrayBuffer(part);
      break;
      default:
        throw "not supported";
    }
  }
};

// This will be replaced by DataView once available.
function BinaryStream(array) {
  this.buffer = array;
  this.index = 0;
}

BinaryStream.prototype.getUint32 = function() {
  this.assertDataAvailable(4);
  var uint32;
  if (this.index % 4 === 0) { // fastpath
    uint32 = new Uint32Array(this.buffer, this.index, 1)[0];
  } else { // ugly hack, waiting for DataView.
    var bytes = new Uint8Array(this.buffer, this.index, 4);
    var b3 = bytes[3],
        b2 = bytes[2],
        b1 = bytes[1],
        b0 = bytes[0];
    uint32 = (b3 << 24) + (b2 << 16) + (b1 << 8) + b0;
  }
  this.index+=4;
  return uint32;
};

BinaryStream.prototype.getInt32 = function() {
  var uint32 = this.getUint32();
  return uint32 > Math.pow(2, 31) - 1 ? uint32 - Math.pow(2, 16) : uint32;
};

BinaryStream.prototype.getUint8 = function() {
  this.assertDataAvailable(1);
  var int8 = Uint8Array(this.buffer, this.index, 1)[0];
  this.index += 1;
  return int8;
};

BinaryStream.prototype.getUint8Array = function(len) {
  this.assertDataAvailable(len);
  var int8array = Uint8Array(this.buffer, this.index, len);
  this.index += len;
  return int8array;
};

/**
 * Advance the index by |len| bytes, discarding the result.
 */
BinaryStream.prototype.advance = function(len) {
  this.assertDataAvailable(len);
  this.index += len;
};

/**
 * Ensure that |len| bytes are available in the stream, or Util.get data.
 */
BinaryStream.prototype.assertDataAvailable = function(len) {
  if (this.index + len > this.buffer.byteLength) {
    alert("no data available : " +
          "index : " + this.index +
          " + len : " + len +
          " > buffer len : " + this.buffer.byteLength);
  }
};

BinaryStream.prototype.parsedBytes = function() {
  return this.index;
};



function OggFile(blob, completion_callback) {
  this.got_bos = false;
  this.metadata = {};
  this.metadata.stream_infos = {};
  // "OggS" string, in hex.
  this.OggS_string = [0x4F, 0x67, 0x67, 0x53];
  // "vorbis" string, in hex.
  this.vorbis_string = [0x76, 0x6F, 0x72, 0x62, 0x69, 0x73];
  this.blob = blob;
  this.offset = 0;
  this.completion_callback = completion_callback;
  this.ogg_header_type_flag = {
    0 : "fresh packet",
    1 : "continued packet",
    2 : "fresh packet, bos",
    3 : "continued packet, bos",
    4 : "fresh packet, eos",
    5 : "continued packet, eos"
  };

  this.vorbis_packet_type_flag = {
    1 : "identification header",
    3 : "comment header",
    5 : "setup header"
  };
}

OggFile.prototype.parse = function() {
  this.parse_header(0);
};

OggFile.prototype.parse_packet = function(data) {
  var _this = this;
  var stream = new BinaryStream(data);
  switch(stream.getUint8()) {
  case 0x01: // identification header
    Util.assert(true, "Found 0x00 at the first byte of the packet : " +
                 "<strong>Identification header.</strong>");

    var vorbis = stream.getUint8Array(6);
    Util.compareArray(vorbis, _this.vorbis_string);

    var version = stream.getUint32();
    Util.assert(version === 0, "Found " + version + " as the version of the stream.");

    var channels = stream.getUint8();
    _this.metadata.stream_infos.channels = channels;
    Util.assert(channels == 2, "Found "+ channels + " channels.");

    var samplerate = stream.getUint32();
    _this.metadata.stream_infos.samplerate = samplerate;
    Util.assert(true, "Samplerate is " + samplerate + ".");

    var min_bitrate = stream.getInt32();
    _this.metadata.stream_infos.min_bitrate = min_bitrate;
    Util.assert(min_bitrate >= 0, "Minimum bitrate is " + min_bitrate + " bits per second.");

    var nominal_bitrate = stream.getInt32();
    _this.metadata.stream_infos.nominal_bitrate = nominal_bitrate;
    Util.assert(nominal_bitrate >= 0, "Nominal bitrate is " +
                                  nominal_bitrate + " bits per second.");

    var max_bitrate = stream.getInt32();
    _this.metadata.stream_infos.max_bitrate = max_bitrate;
    Util.assert(max_bitrate >= 0, "Maximum bitrate is " + max_bitrate + " bits per second.");

    var blocksize = stream.getUint8(),
        blocksize_0 = Math.pow(2, blocksize[0] >> 4),
        blocksize_1 = Math.pow(2, blocksize[0] & 0x0f);

    Util.assert(blocksize_0 >= blocksize_1, "blocksize_0 >= Blocksize_1 → " +
                                        blocksize_0 + " >= " + blocksize_1 + ".");

    var framing_flag = stream.getUint8();
    Util.assert(framing_flag[0] !== 0, "The framing is nonzero : " + framing_flag[0]);

    return "continue";
  case 0x03: // comment header
    Util.assert(true, "Found 0x03 at the beginning of packet : <strong>found comment header </strong>.");

    var vorbis2 = stream.getUint8Array(6);
    Util.compareArray(vorbis2, _this.vorbis_string);

    var version_string_length = stream.getUint32();
    Util.assert(true, "Length of the version string : " + version_string_length);

    Util.get(_this.blob, "utf-8", _this.offset + stream.parsedBytes(), _this.offset + stream.parsedBytes() + version_string_length, function(err, data) {
      _this.offset += stream.parsedBytes() + version_string_length;
      if (err) { alert("Error ! "); return; }

      Util.assert(true, "Version string is : \'" + data + "\'.");

      stream.advance(version_string_length);

      var user_comment_list_length = stream.getUint32();
      _this.offset += 4;
      Util.assert(user_comment_list_length > 0, "User comment list length : " + user_comment_list_length);

      if (user_comment_list_length === 0) {
        _this.completion_callback.bind(_this)();
        return;
      }

      for (var i = 0; i < user_comment_list_length; i++) {
        var len = stream.getUint32();
        stream.advance(len);
        _this.metadata_callback_called = 0;
        Util.get(_this.blob, "utf-8", _this.offset + 4, _this.offset + 4 + len, function get_user_comment(err, data) {
            var equal = data.search('=');
            var key = data.substr(0, equal);
            var value = data.substr(equal + 1);

            _this.metadata[key] = value;

            Util.assert(true, key + " → " + value);

            _this.metadata_callback_called++;
            if (_this.metadata_callback_called === user_comment_list_length) {
              _this.completion_callback.bind(_this)();
              return;
            }
        });
        _this.offset += 4 + len;
      }
    });
    return "stop";
    case 0x05: // setup header
      Util.assert(true, "Found 0x05 at the beginning of packet : <strong>found setup header</strong>.");
      _this.completion_callback.bind(_this)();
      return 'stop';
    default:
      console.log("Bad packet type flag");
    break;
  }
};

OggFile.prototype.parse_segments_table = function(data, count) {
  var _this = this,
      stream = new BinaryStream(data),
      page_size = 0;

  for(var i = 0; i < count; i++) {
    var value = stream.getUint8();
    page_size += value;
  }

  Util.get(_this.blob, "binary", _this.offset, _this.offset + page_size, function(err, data) {
    if (err) { alert("Error ! "); return; }
    if (_this.parse_packet.bind(_this)(data) == "continue") {
      _this.offset += page_size;
      _this.parse_header.bind(_this)(_this.blob);
    }
  });
};

OggFile.prototype.parse_header = function() {
  var _this = this;
  // We Util.get the 27 first bytes of the stream, since it has a fixed size.
  Util.get(_this.blob, "binary", _this.offset, _this.offset + 27, function(err, data) {
    _this.offset += 27;
    if (err) { alert("Error ! "); return; }

    var stream = new BinaryStream(data);

    var OggS = stream.getUint8Array(4);
    Util.assert(Util.compareArray(OggS, _this.OggS_string), "First four bytes are " + Util.asciiArrayToString(OggS) + "");

    var ogg_version = stream.getUint8();
    Util.assert(ogg_version === 0, "Ogg version is " + ogg_version);

    var header_type_flag = stream.getUint8();
    Util.assert(header_type_flag <= 5, "Got a header flag : " + _this.header_type_flag + " → " + _this.ogg_header_type_flag[header_type_flag]);

    var granule_pos_lsb = stream.getUint32();
    var granule_pos_msb = stream.getUint32();

    Util.assert(granule_pos_lsb === 0 && granule_pos_msb === 0, "Granule pos is initially " + granule_pos_lsb + " " + granule_pos_msb);

    var serial_number = stream.getUint32();
    Util.assert(true, "Serial number is : " + serial_number);

    var page_sequence = stream.getUint32();
    Util.assert(true, "Page sequence number " + page_sequence);

    var checksum = stream.getUint32();
    Util.assert(true, "Checksum : " + checksum);

    var page_segments = stream.getUint8();
    Util.assert(true, "Number of segments : " + page_segments);

    Util.get(_this.blob, "binary", _this.offset, _this.offset + page_segments, function(err, data) {
      if (err) { alert("Error ! "); return; }
      _this.offset += page_segments;
      _this.parse_segments_table.bind(_this)(data, page_segments);
    });
  });
};

