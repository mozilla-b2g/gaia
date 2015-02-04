var exec = require('child_process').exec;
var VOLUME_REGEX = /\/Volumes\/(.*)/m;

/**
 * Mount a dmg file and return its mounted path.
 *
 * @param {String} path location of .dmg.
 * @param {Function} callback [Error err, String mountedVolume].
 */
function mount(path, callback) {
  var command = [
    'hdiutil',
    'mount',
    '"' + path + '"'
  ];

  exec(command.join(' '), function(err, stdout, stderr) {
    if (err) return callback(err);

    // extract volume path
    var match = stdout.match(VOLUME_REGEX);

    if (!match) {
      return callback(
        new Error('could not extract path out of mount result: ' + stdout)
      );
    }

    callback(null, match[0]);
  });
}

/**
 * Unmount a dmg volume.
 *
 * @param {String} path to unmount.
 * @param {Function} callback [Error err]
 */
function unmount(path, callback) {
  if (!VOLUME_REGEX.test(path))
    throw new Error('path must contain /Volumes/');

  var command = [
    'hdiutil',
    'unmount',
    '"' + path + '"'
  ];

  exec(command.join(' '), function(err) {
    if (err) return callback(err);
    callback();
  });
}

module.exports.mount = mount;
module.exports.unmount = unmount;
