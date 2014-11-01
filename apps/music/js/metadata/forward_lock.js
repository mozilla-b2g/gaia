/* global AudioMetadata, ForwardLock */
/* exported ForwardLockMetadata */
'use strict';

var ForwardLockMetadata = (function() {

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
            if (!metadata.title) {
              metadata.title = unlockedMetadata.name;
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
