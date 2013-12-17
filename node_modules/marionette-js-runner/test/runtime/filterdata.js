suite('runtime/filterdata', function() {
  var subject = require('../../lib/runtime/filterdata').FilterData;

  suite('#validateArray', function() {
    test('is in array', function() {
      assert.ok(subject.validateArray([1, 2], 2));
    });

    test('not in array', function() {
      assert.ok(!subject.validateArray([1, 2], 4));
    });
  });

  suite('#validate', function() {
    function verify(name, filter, metadata, result) {
      test(name, function() {
        assert.equal(subject.validate(filter, metadata), result);
      });
    }

    function valid(name, filter, metadata) {
      verify(name, filter, metadata, true);
    }

    function invalid(name, filter, metadata) {
      verify(name, filter, metadata, false);
    }

    valid('empty filter and metadata', {}, {}, true);
    valid('empty fitler', {}, { host: 'firefox' }, true);

    valid(
      'single valid filter option',
      { host: 'firefox' },
      { host: 'firefox' }
    );

    invalid('missing property in metadata', { host: 'firefox' }, {});
    invalid('mismatched properties', { host: 'a' }, { host: 'b' });

    valid(
      'array filter values (metadata property must match one value in array)',
      { host: ['a', 'b', 'c'] },
      { host: 'c' }
    );

    invalid(
      'metadata property exists but not in array',
      { host: ['a', 'b'] },
      { host: 'c' }
    );

    valid(
      'filter requires multiple properties',
      { host: ['a', 'b'], wifi: true },
      { host: 'a', wifi: true }
    );

    invalid(
      'partial matching of metadata',
      { host: 'a', wifi: true },
      { host: 'a' }
    );
  });
});
