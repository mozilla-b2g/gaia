
/**
 * Benchmark dependencies.
 */

var benchmark = require('benchmark')
  , colors = require('colors')
  , ws = require('../lib/websocket.io')
  , Parser = ws.protocols['13'].Parser
  , suite = new benchmark.Suite('Parser')

/**
 * Parser utilities
 */

require('../support/parser-common')

/**
 * Setup parsers.
 */

suite.on('start', function () {
  parser = new Parser
});

suite.on('cycle', function () {
  parser = new Parser
});

/**
 * Benchmarks.
 */

suite.add('ping message', function () {
  var message = 'Hello'
    , packet = '89 FE ' + pack(4, message.length) + ' 34 83 a8 68 '
      + getHexStringFromBuffer(mask(message, '34 83 a8 68'))

  parser.add(getBufferFromHexString(packet));
});

suite.add('ping with no data', function () {
  var packet = '89 00'

  parser.add(getBufferFromHexString(packet));
});

suite.add('close message', function () {
  var packet = '88 00'

  parser.add(getBufferFromHexString(packet));
  parser.endPacket();
});

suite.add('masked text message', function () {
  var packet = '81 93 34 83 a8 68 01 b9 92 52 4f a1 c6 09 59 e6 8a 52 16 e6 cb 00 5b a1 d5'

  parser.add(getBufferFromHexString(packet));
});

suite.add('binary data', function () {
  var length = 100
    , message = new Buffer(length)

  for (var i = 0; i < length; ++i) {
    message[i] = i % 256;
  }

  var originalMessage = getHexStringFromBuffer(message)
    , packet = '82 ' + getHybiLengthAsHexString(length, true) + ' 34 83 a8 68 '
      + getHexStringFromBuffer(mask(message, '34 83 a8 68'))

  parser.add(getBufferFromHexString(packet));
});

suite.add('binary data (long)', function () {
  var length = 200 * 1024
    , message = new Buffer(length)

  for (var i = 0; i < length; ++i) {
    message[i] = i % 256;
  }

  var originalMessage = getHexStringFromBuffer(message)
    , packet = '82 ' + getHybiLengthAsHexString(length, false) + ' '
      + getHexStringFromBuffer(message)

  parser.add(getBufferFromHexString(packet));
});

/**
 * Output progress.
 */

suite.on('cycle', function (bench, details) {
  console.log('\n  ' + suite.name.grey, details.name.white.bold);
  console.log('  ' + [
      details.hz.toFixed(2).cyan + ' ops/sec'.grey
    , details.count.toString().white + ' times executed'.grey
    , 'benchmark took '.grey + details.times.elapsed.toString().white + ' sec.'.grey
    , 
  ].join(', '.grey));
});

/**
 * Run/export benchmarks.
 */

if (!module.parent) {
  suite.run();
} else {
  module.exports = suite;
}
