
/**
 * Test dependencies.
 */

var Parser = require('../lib/websocket.io').protocols['8'].Parser

/**
 * Tests.
 */

describe('hybi07-12 parser', function () {

  describe('masking', function () {
    it('can parse unmasked text message', function () {
      var p = new Parser()
        , packet = '81 05 48 65 6c 6c 6f'
        , gotData = false

      p.on('text', function (data) {
        gotData = true;
        data.should.equal('Hello');
      });

      p.add(getBufferFromHexString(packet));
      gotData.should.be.true;
    });

    it('can parse masked text message', function () {
      var p = new Parser()
        , packet = '81 93 34 83 a8 68 01 b9 92 52 4f a1 c6 09 59 e6 8a 52 16 e6 cb 00 5b a1 d5'
        , gotData = false

      p.on('text', function (data) {
        gotData = true;
        data.should.equal('5:::{"name":"echo"}');
      });

      p.add(getBufferFromHexString(packet));
      gotData.should.be.true;
    });

    it('can parse a masked text message longer than 125 bytes', function () {
      var p = new Parser()
        , message = 'A'

      for (var i = 0; i < 300; ++i) {
        message += (i % 5).toString();
      }

      var packet = '81 FE ' + pack(4, message.length) + ' 34 83 a8 68 '
          + getHexStringFromBuffer(mask(message, '34 83 a8 68'))
        , gotData = false

      p.on('text', function (data) {
        gotData = true;
        message.should.equal(data);
      });
    
      p.add(getBufferFromHexString(packet));
      gotData.should.be.true;
    });

    it('can parse a really long masked text message', function () {
      var p = new Parser()
        , message = 'A'

      for (var i = 0; i < 64*1024; ++i) {
        message += (i % 5).toString();
      }

      var packet = '81 FF ' + pack(16, message.length) + ' 34 83 a8 68 '
          + getHexStringFromBuffer(mask(message, '34 83 a8 68'))
        , gotData = false

      p.on('text', function (data) {
        gotData = true;
        message.should.equal(data);
      });

      p.add(getBufferFromHexString(packet));
      gotData.should.be.true;
    });
  });

  describe('special messages', function () {
    it('can parse close message', function () {
      var p = new Parser()
        , packet = '88 00'
        , gotClose = false

      p.on('close', function (data) {
        gotClose = true;
      });

      p.add(getBufferFromHexString(packet));
      gotClose.should.be.true;
    });

    it('can parse a ping message', function () {
      var p = new Parser()
        , message = 'Hello'
        , packet = '89 ' + getHybiLengthAsHexString(message.length, true) + ' 34 83 a8 68 '
          + getHexStringFromBuffer(mask(message, '34 83 a8 68'))
        , gotPing = false

      p.on('ping', function (data) {
        gotPing = true;
        message.should.equal(data.toString());
      });

      p.add(getBufferFromHexString(packet));
      gotPing.should.be.true;
    });

    it('can parse a ping with no data', function () {
      var p = new Parser()
        , packet = '89 00'
        , gotPing = false

      p.on('ping', function (data) {
        gotPing = true;
      });

      p.add(getBufferFromHexString(packet));
      gotPing.should.be.true;
    });
  });

  describe('fragmentation', function () {
    it('can parse a fragmented masked text message of 300 bytes', function () {
      var p = new Parser()
        , message = 'A'

      for (var i = 0; i < 300; ++i) {
        message += (i % 5).toString();
      }

      var msgpiece1 = message.substr(0, 150)
        , msgpiece2 = message.substr(150)
        , packet1 = '01 FE ' + pack(4, msgpiece1.length) + ' 34 83 a8 68 '
          + getHexStringFromBuffer(mask(msgpiece1, '34 83 a8 68'))
        , packet2 = '80 FE ' + pack(4, msgpiece2.length) + ' 34 83 a8 68 '
          + getHexStringFromBuffer(mask(msgpiece2, '34 83 a8 68'))
        , gotData = false;

      p.on('text', function (data) {
        gotData = true;
        message.should.equal(data);
      });

      p.add(getBufferFromHexString(packet1));
      p.add(getBufferFromHexString(packet2));

      gotData.should.be.true;
    });

    it('can parse a fragmented masked text message of 300 bytes with a ping in the middle', function () {
      var p = new Parser()
        , message = 'A'

      for (var i = 0; i < 300; ++i) {
        message += (i % 5).toString();
      }

      var msgpiece1 = message.substr(0, 150)
        , packet1 = '01 FE ' + pack(4, msgpiece1.length) + ' 34 83 a8 68 '
          + getHexStringFromBuffer(mask(msgpiece1, '34 83 a8 68'))
        , pingMessage = 'Hello'
        , pingPacket = '89 ' + getHybiLengthAsHexString(pingMessage.length, true) + ' 34 83 a8 68 '
          + getHexStringFromBuffer(mask(pingMessage, '34 83 a8 68'))
        , msgpiece2 = message.substr(150)
        , packet2 = '80 FE ' + pack(4, msgpiece2.length) + ' 34 83 a8 68 '
          + getHexStringFromBuffer(mask(msgpiece2, '34 83 a8 68'))
        , gotData = false;

      p.on('text', function (data) {
        gotData = true;
        message.should.equal(data);
      });

      var gotPing = false;

      p.on('ping', function (data) {
        gotPing = true;
        pingMessage.should.equal(data.toString());
      });

      p.add(getBufferFromHexString(packet1));
      p.add(getBufferFromHexString(pingPacket));
      p.add(getBufferFromHexString(packet2));

      gotData.should.be.true;
      gotPing.should.be.true;
    });

    it('can parse a fragmented masked text message of 300 bytes with a ping in the middle, which is delievered over sevaral tcp packets', function () {
      var p = new Parser()
        , message = 'A'

      for (var i = 0; i < 300; ++i) {
        message += (i % 5).toString();
      }

      var msgpiece1 = message.substr(0, 150)
        , packet1 = '01 FE ' + pack(4, msgpiece1.length) + ' 34 83 a8 68 '
          + getHexStringFromBuffer(mask(msgpiece1, '34 83 a8 68'))
        , pingMessage = 'Hello'
        , pingPacket = '89 ' + getHybiLengthAsHexString(pingMessage.length, true) + ' 34 83 a8 68 '
          + getHexStringFromBuffer(mask(pingMessage, '34 83 a8 68'))
        , msgpiece2 = message.substr(150)
        , packet2 = '80 FE ' + pack(4, msgpiece2.length) + ' 34 83 a8 68 '
          + getHexStringFromBuffer(mask(msgpiece2, '34 83 a8 68'))
        , gotData = false

      p.on('text', function (data) {
        gotData = true;
        message.should.equal(data);
      });

      var gotPing = false;

      p.on('ping', function (data) {
        gotPing = true;
        pingMessage.should.equal(data.toString());
      });

      var buffers = [];

      buffers = buffers.concat(splitBuffer(getBufferFromHexString(packet1)));
      buffers = buffers.concat(splitBuffer(getBufferFromHexString(pingPacket)));
      buffers = buffers.concat(splitBuffer(getBufferFromHexString(packet2)));

      for (var i = 0; i < buffers.length; ++i) {
        p.add(buffers[i]);
      }

      gotData.should.be.true;
      gotPing.should.be.true;
    });
  });

  describe('binary data', function () {
    it('can parse a 100 byte long masked binary message', function () {
      var p = new Parser()
        , length = 100
        , message = new Buffer(length)

      for (var i = 0; i < length; ++i) {
        message[i] = i % 256;
      }

      var originalMessage = getHexStringFromBuffer(message)
        , packet = '82 ' + getHybiLengthAsHexString(length, true) + ' 34 83 a8 68 '
          + getHexStringFromBuffer(mask(message, '34 83 a8 68'))
        , gotData = false

      p.on('binary', function (data) {
        gotData = true;
        originalMessage.should.equal(getHexStringFromBuffer(data));
      });

      p.add(getBufferFromHexString(packet));
      gotData.should.be.true;
    });

    it('can parse a 256 byte long masked binary message', function () {
      var p = new Parser()
        , length = 256
        , message = new Buffer(length)

      for (var i = 0; i < length; ++i) {
        message[i] = i % 256;
      }

      var originalMessage = getHexStringFromBuffer(message)
        , packet = '82 ' + getHybiLengthAsHexString(length, true) + ' 34 83 a8 68 '
          + getHexStringFromBuffer(mask(message, '34 83 a8 68'))
        , gotData = false

      p.on('binary', function (data) {
        gotData = true;
        originalMessage.should.equal(getHexStringFromBuffer(data));
      });

      p.add(getBufferFromHexString(packet));
      gotData.should.be.true;
    });

    it('can parse a 200kb long masked binary message', function () {
      var p = new Parser()
        , length = 200 * 1024
        , message = new Buffer(length)

      for (var i = 0; i < length; ++i) {
        message[i] = i % 256;
      }

      var originalMessage = getHexStringFromBuffer(message)
        , packet = '82 ' + getHybiLengthAsHexString(length, true) + ' 34 83 a8 68 '
          + getHexStringFromBuffer(mask(message, '34 83 a8 68'))
        , gotData = false

      p.on('binary', function (data) {
        gotData = true;
        originalMessage.should.equal(getHexStringFromBuffer(data));
      });

      p.add(getBufferFromHexString(packet));
      gotData.should.be.true;
    });

    it('can parse a 200kb long unmasked binary message', function () {
      var p = new Parser()
        , length = 200 * 1024
        , message = new Buffer(length)

      for (var i = 0; i < length; ++i) {
        message[i] = i % 256;
      }

      var originalMessage = getHexStringFromBuffer(message)
        , packet = '82 ' + getHybiLengthAsHexString(length, false) + ' '
          + getHexStringFromBuffer(message)
        , gotData = false

      p.on('binary', function (data) {
        gotData = true;
        originalMessage.should.equal(getHexStringFromBuffer(data));
      });

      p.add(getBufferFromHexString(packet));
      gotData.should.be.true;
    });
  });

});
