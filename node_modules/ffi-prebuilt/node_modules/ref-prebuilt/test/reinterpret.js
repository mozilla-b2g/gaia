
var assert = require('assert')
var weak = require('weak')
var ref = require('../')

describe('reinterpret()', function () {

  beforeEach(gc)

  it('should return a new Buffer instance at the same address', function () {
    var buf = new Buffer('hello world')
    var small = buf.slice(0, 0)
    assert.strictEqual(0, small.length)
    assert.strictEqual(buf.address(), small.address())
    var reinterpreted = small.reinterpret(buf.length)
    assert.strictEqual(buf.address(), reinterpreted.address())
    assert.strictEqual(buf.length, reinterpreted.length)
    assert.strictEqual(buf.toString(), reinterpreted.toString())
  })

  it('should retain a reference to the original Buffer when reinterpreted', function () {
    var origGCd = false
    var otherGCd = false
    var buf = new Buffer(1)
    weak(buf, function () { origGCd = true })
    var other = buf.reinterpret(0)
    weak(other, function () { otherGCd = true })

    assert(!origGCd, '"buf" has been garbage collected too soon')
    assert(!otherGCd, '"other" has been garbage collected too soon')

    // try to GC `buf`
    buf = null
    gc()
    assert(!origGCd, '"buf" has been garbage collected too soon')
    assert(!otherGCd, '"other" has been garbage collected too soon')

    // now GC `other`
    other = null
    gc()
    assert(otherGCd, '"other" has not been garbage collected')
    assert(origGCd, '"buf" has not been garbage collected')
  })

  describe('reinterpretUntilZeros()', function () {

    it('should return a new Buffer instance up until the first 0', function () {
      var buf = new Buffer('hello\0world')
      var buf2 = buf.reinterpretUntilZeros(1)
      assert.equal(buf2.length, 'hello'.length)
      assert.equal(buf2.toString(), 'hello')
    })

    it('should return a new Buffer instance up until the first 2-byte sequence of 0s', function () {
      var str = 'hello world'
      var buf = new Buffer(50)
      var len = buf.write(str, 'ucs2')
      buf.writeInt16LE(0, len) // NULL terminate the string

      var buf2 = buf.reinterpretUntilZeros(2)
      assert.equal(str.length, buf2.length / 2)
      assert.equal(buf2.toString('ucs2'), str)
    })

  })

})
