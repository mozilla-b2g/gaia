'use strict';

var ForwardLockMetadata = (function() {
  // TODO: remove these
  var TAG_FORMAT = 'tag_format';
  var TITLE = 'title';
  var ARTIST = 'artist';
  var ALBUM = 'album';
  var TRACKNUM = 'tracknum';
  var TRACKCOUNT = 'trackcount';
  var DISCNUM = 'discnum';
  var DISCCOUNT = 'disccount';
  var IMAGE = 'picture';

  function parse(locked) {
    return new Promise(function(resolve, reject) {
      ForwardLock.getKey(function(secret) {
        ForwardLock.unlockBlob(secret, locked, callback, reject);

        function callback(unlocked, unlockedMetadata) {
          // Now that we have the unlocked content of the locked file,
          // convert it back to a blob and recurse to parse the metadata.
          // When we're done, add metadata to indicate that this is locked
          // content (so it isn't shared) and to specify the vendor that
          // locked it.
          resolve(AudioMetadata.parse(unlocked)).then(function(metadata) {
            metadata.locked = true;
            if (unlockedMetadata.vendor) {
              metadata.vendor = unlockedMetadata.vendor;
            }
            if (!metadata[TITLE]) {
              metadata[TITLE] = unlockedMetadata.name;
            }
            return metadata;
          });
        }
      });
    });
  }

  return {
    parse: parse
  };

})();
