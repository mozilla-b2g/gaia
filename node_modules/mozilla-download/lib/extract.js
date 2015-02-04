var fs = require('fs'),
    fsPath = require('path'),
    ncp = require('ncp').ncp,
    tmp = require('tmp'),
    debug = require('debug')('mozilla-runner:extract');

var productMap = {
  firefox: {
    'tar.bz2': {
      root: 'firefox'
    },
    'dmg': {
      root: /^Firefox/
    }
  },

  b2g: {
    'tar.bz2': {
      root: 'b2g'
    },
    'dmg': {
      root: 'B2G.app'
    }
  }
};

/**
 * Extracts the firefox or b2g runtime from a compressed format.
 *
 * @param {String} product typically 'firefox' or 'b2g'.
 * @param {String} originalSource from the ftp site.
 * @param {String} source on the filesystem (compressed)
 * @param {String} target on the file system (destination decompressed)
 * @param {Function} callback [err, path].
 */
function extract(product, originalSource, source, target, callback) {
  debug('request', product, originalSource);

  if (originalSource.split('.').pop() === 'dmg')
    return extractDmg(product, source, target, callback);

  if (originalSource.split('.').pop() === 'zip')
    //XXX: handle zip extractions
    return;

  if (originalSource.substr(-7) === 'tar.bz2')
    return extractTarBz2(product, source, target, callback);

}

function extractTarBz2(product, source, target, callback) {
  var config = productMap[product]['tar.bz2'];
  debug('tar.bz2', config, source, target);

  var exec = require('child_process').exec;
  var rootFile = 'b2g';

  function copy(location) {
    debug('copy contents of decompression');
    ncp(location, target, function(err) {
      if (err) return callback(err);
      callback(null, target);
    });
  }

  function decompress(dirPath) {
    var command = [
      'tar',
      '-vxjf',
      source,
      '-C',
      dirPath
    ];

    debug('decompress bz2', command);
    exec(command.join(' '), function(err, stdout, stderr) {
      if (err) return callback(err);
      copy(fsPath.join(dirPath, config.root));
    });
  }

  tmp.dir({ prefix: product, unsafeCleanup: true }, function(err, dirPath) {
    if (err) return callback(err);
    debug('bz2 temp dir created', dirPath);
    decompress(dirPath);
  });
}

function extractDmg(product, source, target, callback) {
  var config = productMap[product].dmg;

  debug('dmg', config, source, target);
  var dmg = require('dmg');

  /**
   * Trigger unmount and then fire callback
   *
   * @param {String} mountPath of volume.
   */
  function unmount(mountPath) {
    debug('dmg', 'unmount', mountPath);
    dmg.unmount(mountPath, function(err) {
      if (err) return callback(err);
      callback(null, target);
    });
  }

  /**
   * Copy single directory from dmg
   *
   * @param {String} mountPath of volume.
   * @param {String} appDir directory of app target.
   */
  function copyMounted(mountPath, appDir) {
    debug('dmg mounted', source, mountPath);
    ncp(
      appDir,
      target,
      function(err) {
        debug('dmg copying directory done');
        if (err) return callback(err);
        // cleanup mounted dmg prior to returning.
        // call process.nextTick gives something enough time
        // to finish using the volume so it can actually unmount
        // I am not quite sure what holds it up but this works.
        process.nextTick(unmount.bind(null, mountPath));
      }
    );
  }

  // mount the dmg
  dmg.mount(source, function(err, mountPath) {
    if (err) return callback(err);
    fs.readdir(mountPath, function(err, files) {
      if (err) return callback(err);

      var i = 0;
      var len = files.length;
      // current file in volume
      var file;

      // search for the first file that matches the root
      for (; i < len; i++) {
        file = files[i];
        // continue once first match is found
        if (file.match(config.root))
          return copyMounted(mountPath, fsPath.join(mountPath, file));
      }

      callback(new Error('could not find: "' + config.root + '"'));
    });
  });
}

module.exports = extract;
