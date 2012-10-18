assert.hasProperties = function chai_hasProperties(given, props, msg) {
  msg = (typeof(msg) === 'undefined') ? '' : msg + ': ';

  if (props instanceof Array) {
    props.forEach(function(prop) {
      assert.ok(
        (prop in given),
        msg + 'given should have "' + prop + '" property'
      );
    });
  } else {
    for (var key in props) {
      assert.deepEqual(
        given[key],
        props[key],
        msg + ' property equality for (' + key + ') '
      );
    }
  }
};
