
var assert = require('assert')

var a = '\
foo\n\
bar\n\
baz\n\
raz\
'

var b = '\
foo\n\
bar\n\
baz\n\
\n\
\n\
\n\
raz\
'

describe('foo', function(){
  it('should', function(){
    b.should.equal(a)
  })
})