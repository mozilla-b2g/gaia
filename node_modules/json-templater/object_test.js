suite('object', function() {
  var subject = require('./object');
  var assert = require('assert');

  function verify(title, input, output) {
    test(title, function() {
      var result = subject.apply(subject, input);
      assert.deepEqual(output, result);
    });
  }


  verify(
    'replace value in nested object',
    [
      {
        foo: {
          bar: '{{say.what}}'
        }
      },
      {
        say: { what: 'yeah' }
      }
    ],
    {
      foo: {
        bar: 'yeah'
      }
    }
  );

  verify(
    'replace keys',
    [
      {
        'mykeywins{{yes}}': 'value'
      },
      { yes: 'no' }
    ],
    { 'mykeywinsno': 'value' }
  );

  verify(
    'boolean',
    [{ 'woot': true }, {}],
    { woot: true }
  );

  verify(
    'undefined',
    [
      {
        key: 'value',
        object: {
          nested: undefined
        }
      },
      []
    ],
    {
      key: 'value',
      object: {
        nested: undefined
      }
    }
  );

  verify(
    'array',
    [
      ['foo', 'bar{{1}}', 'baz{{2}}'],
      ['ignore me', '-first', '-second']
    ],
    [
      'foo',
      'bar-first',
      'baz-second'
    ]
  );

  verify(
    'number',
    [{ xfoo: 1 }, {}],
    { xfoo: 1 }
  );
});
