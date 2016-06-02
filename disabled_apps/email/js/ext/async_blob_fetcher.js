define(
  [
    'exports'
  ],
  function(
    exports
  ) {

/**
 * Asynchronously fetch the contents of a Blob, returning a Uint8Array.
 * Exists because there is no FileReader in Gecko workers and this totally
 * works.  In discussion, it sounds like :sicking wants to deprecate the
 * FileReader API anyways.
 *
 * Our consumer in this case is our specialized base64 encode that wants a
 * Uint8Array since that is more compactly represented than a binary string
 * would be.
 *
 * @param blob {Blob}
 * @param callback {Function(err, Uint8Array)}
 */
function asyncFetchBlobAsUint8Array(blob, callback) {
  var blobUrl = URL.createObjectURL(blob);
  var xhr = new XMLHttpRequest();
  xhr.open('GET', blobUrl, true);
  xhr.responseType = 'arraybuffer';
  xhr.onload = function() {
    // blobs currently result in a status of 0 since there is no server.
    if (xhr.status !== 0 && (xhr.status < 200 || xhr.status >= 300)) {
      callback(xhr.status);
      return;
    }
    callback(null, new Uint8Array(xhr.response));
  };
  xhr.onerror = function() {
    callback('error');
  };
  try {
    xhr.send();
  }
  catch(ex) {
    console.error('XHR send() failure on blob');
    callback('error');
  }
  URL.revokeObjectURL(blobUrl);
}

return {
  asyncFetchBlobAsUint8Array: asyncFetchBlobAsUint8Array
};

}); // end define
