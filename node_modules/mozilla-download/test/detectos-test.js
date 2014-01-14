suite('detect', function() {
  var detectOS = require('../lib/detectos');
  var assert = require('assert');

  suite('#detectOS', function() {
    var expected = [
      [{ platform: 'darwin', arch: 'x64' }, 'mac'],
      // something other then x64 (unlikely)
      [{ platform: 'darwin', arch: 'ia32' }, 'mac'],
      [{ platform: 'win32', arch: 'ia32' }, 'win32'],
      [{ platform: 'linux', arch: 'ia32' }, 'linux-i686'],
      [{ platform: 'linux', arch: 'x64' }, 'linux-x86_64']
    ];

    expected.forEach(function(pair) {
      var input = pair[0];
      var expected = pair[1];

      var name = input.platform + ' arch ' + input.arch;
      test(name, function() {
        assert.equal(detectOS('b2g', input), expected);
      });
    });
  });
});
