/*
 * This file defines a ForwardLock object with functions for locking and
 * unlocking content and for key management for the FirefoxOS implementation
 * of OMA Forward Lock DRM.
 *
 * A locked file has the following structure:
 *
 * 6 bytes: ASCII "LOCKED" magic number
 * 2 bytes: version number as 2 ASCII characters. e.g: " 1"
 * 1 byte:  ASCII space
 * n bytes: MIME type of the locked content, in ASCII
 * 1 byte:  ASCII \n delimiter
 * n bytes: other ASCII metadata as key:value pairs, delimited with newlines.
 *          Both key and value passed to JavaScript escape()
 * 1 byte : 0. NUL terminates the ASCII text, and marks the beginning
 *          of the audio content
 *    rest: The audio content xor'ed with the secret key
 *
 * The blob returned by the lock functions shares the first part of its
 * MIME type ("image/", "audio/", etc.) with the content. But it has a
 * sub-type of "vnd.mozilla.oma.drm.fl" to indicate that it is locked.
 *
 * The secret key used for locking and unlocking content is stored in
 * the settings database. The security of the key is based entirely on
 * the fact that only certified apps can read settings.  So the secret
 * is shared among all certified apps.
 */
'use strict';

(function(exports) {
  // Make sure we only run once
  if (exports.ForwardLock)
    return;

  const mimeSubtype = 'vnd.mozilla.oma.drm.fl';
  const SECRET_SETTINGS_ID = 'oma.drm.forward_lock.secret.key';
  var secret = null;


  // XOR the buffer contents with the key.
  // This is pretty fast, but maybe using asm.js could make it faster.
  function xor(buffer, key) {
    // View the array buffer as 32-bit words. There may be 1 to 3
    // bytes at the end of the buffer that are not encrypted.
    var words = new Uint32Array(buffer, 0, buffer.byteLength >> 2);
    for (var i = 0, n = words.length; i < n; i++)
      words[i] ^= key;
  }

  // Return a blob in .lcka format for specified audio content,
  // metadata and secret key. Key is a 4-byte integer. content is an
  // ArrayBuffer holding the file content, and metadata is an object
  // that can be serialized with JSON.stringify.
  function lockBuffer(secret, content, type, metadata) {
    var header = 'LOCKED 1 ' + escape(type) + '\n';
    if (metadata) {
      for (var p in metadata) {
        header += escape(p) + ':' + escape(metadata[p]) + '\n';
      }
    }
    header += '\0';

    // Make a private copy of the buffer so we don't modify the caller's copy.
    var buffer = new Uint8Array(new Uint8Array(content)).buffer;

    // Perform the encryption
    xor(buffer, secret);

    // And return the blob with a custom MIME type
    return new Blob([header, buffer], {
      type: type.split('/')[0] + '/' + mimeSubtype
    });
  }

  // Given the secret key the unlocked blob, and some metadata,
  // create a locked blob and pass it to the callback
  function lockBlob(secret, blob, metadata, callback) {
    var reader = new FileReader();
    reader.readAsArrayBuffer(blob);
    reader.onload = function() {
      callback(lockBuffer(secret, reader.result, blob.type, metadata));
    };
  }

  // Given a .lcka blob, and the key used to encrypt it, parse the
  // metadata and decrypt the content and pass them to the specified
  // callback. If the input blob is not in the right format, call
  // errorCallback with an string message.
  function unlockBlob(secret, blob, callback, errorCallback) {
    var reader = new FileReader();
    reader.readAsArrayBuffer(blob);
    reader.onload = function() {
      var buffer = reader.result;
      var bytes = new Uint8Array(buffer);
      var header = '';
      var contentStart;
      for (var i = 0; i < bytes.length; i++) {
        if (bytes[i] === 0) {
          contentStart = i + 1;
          break;
        }
        header += String.fromCharCode(bytes[i]);
      }

      if (!header.startsWith('LOCKED'))
        return error('Bad magic number');
      if (header.substring(6, 9) !== ' 1 ')
        return error('Unsupported version number');
      if (!contentStart)
        return error('No content');

      var eol = header.indexOf('\n');
      if (eol === -1)
        return error('malformed header');

      var type = unescape(header.substring(9, eol).trim());

      var metadata = {};
      var lines = header.substring(eol + 1).split('\n');
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (!line)  // ignore blank line at the end of the key:value pairs
          continue;
        var [key, value] = line.split(':');
        if (!key || !value)
          return error('malformed metadata');
        metadata[unescape(key)] = unescape(value);
      }

      var content = buffer.slice(contentStart);
      // Decryption is the same as encryption
      xor(content, secret);
      var blob = new Blob([content], { type: type });

      try {
        callback(blob, metadata);
      }
      catch (e) {
        console.error('Exception in content callback', e);
      }
    };

    function error(msg) {
      msg = 'LCKA.decrypt(): ' + msg;
      if (errorCallback) {
        try {
          errorCallback(msg);
        }
        catch (e) {
          console.error('Exception in error callback', e);
        }
      }
      else {
        console.error(msg);
      }
    }
  }

  // If we already know the secret key, pass it directly to the callback.
  // Otherwise, look it up in the settings database and call the callback
  // asynchronously. If the key does not exist in the db, pass null.
  // This requires read permission for the settings database.
  // Only certified apps can have that permission
  function getKey(callback) {
    try {
      if (secret !== null) {
        report(secret);
        return;
      }

      var lock = navigator.mozSettings.createLock();
      var getreq = lock.get(SECRET_SETTINGS_ID);
      getreq.onsuccess = function() {
        secret = getreq.result[SECRET_SETTINGS_ID] || null;
        report(secret);
      };
      getreq.onerror = function() {
        console.error('Error getting ForwardLock setting', getreq.error);
        report(null);
      };
    }
    catch (e) {
      console.error('Exception in ForwardLock.getKey():', e);
      report(null);
    }

    function report(secret) {
      if (callback) {
        try {
          callback(secret);
        }
        catch (e) {
          console.error('Exception in ForwardLock.getKey() callback');
        }
      }
    }
  }

  // This function works like getKey, but if the key does not exist, it
  // is created. This requires write access to the settings DB. The intent
  // is that only the Locked Content app will ever call this
  function getOrCreateKey(callback) {
    getKey(function(key) {
      if (key !== null) {
        report(key);
        return;
      }

      // The key does not exist yet so create one that is not zero.
      secret = ((Math.random() * 0xFFFFFFFF) | 0) + 1;

      // Now attempt to save the key to the settings db.
      var setting = {};
      setting[SECRET_SETTINGS_ID] = secret;
      var setreq = navigator.mozSettings.createLock().set(setting);
      setreq.onsuccess = function() {
        // If we have permission to write to the settings db, then
        // the key is now saved for other apps to read
        report(secret);
      };
      setreq.onerror = function() {
        // Only apps with correct permissions should call this function
        // so this should not happen. We don't call the callback if
        // this happens because we want to fail early in this case.
        console.error('Failed to set key in ForwardLock.getOrCreateKey()',
                      setreq.error.name);
        secret = null;
      };
    });

    function report(secret) {
      if (callback) {
        try {
          callback(secret);
        }
        catch (e) {
          console.error('Exception in ForwardLock.getOrCreateKey() callback');
        }
      }
    }
  }

  exports.ForwardLock = {
    lockBuffer: lockBuffer,
    lockBlob: lockBlob,
    unlockBlob: unlockBlob,
    mimeSubtype: mimeSubtype,
    getKey: getKey,
    getOrCreateKey: getOrCreateKey
  };

}(this));
