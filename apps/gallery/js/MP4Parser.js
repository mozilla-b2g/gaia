'use strict';

function MP4Parser(blob, handlers) {
  // Start off with a 4kb chunk from the start of the blob.
  BlobView.get(blob, 0, 4096, function(data, error) {
    // Make sure that the blob is, in fact, some kind of MP4 file
    if (data.getASCIIText(4, 4) !== 'ftyp') {
      handlers.errorHandler('not an MP4 file');
      return;
    }
    parseAtom(data);
  });


  // Call this with a BlobView object that includes the first 16 bytes of
  // an atom. It doesn't matter whether the body of the atom is included.
  function parseAtom(data) {
    var offset = data.sliceOffset + data.viewOffset; // atom position in blob
    var size = data.readUnsignedInt();               // atom length
    var type = data.readASCIIText(4);                // atom type
    var contentOffset = 8;                           // position of atom content

    if (size === 0) {
      // Zero size means the rest of the file
      size = blob.size - offset;
    }
    else if (size === 1) {
      // A size of 1 means the size is in bytes 8-15
      size = data.readUnsignedInt() * 4294967296 + data.readUnsignedInt();
      contentOffset = 16;
    }

    var handler = handlers[type] || handlers.defaultHandler;
    if (typeof handler === 'function') {
      // If the handler is a function, pass that function a
      // DataView object that contains the entire atom
      // including size and type.  Then use the return value
      // of the function as instructions on what to do next.
      data.getMore(data.sliceOffset + data.viewOffset, size, function(atom) {
        // Pass the entire atom to the handler function
        var rv = handler(atom);

        // If the return value is 'done', stop parsing.
        // Otherwise, continue with the next atom.
        // XXX: For more general parsing we need a way to pop some
        // stack levels.  A return value that is an atom name should mean
        // pop back up to this atom type and go on to the next atom
        // after that.
        if (rv !== 'done') {
          parseAtomAt(data, offset + size);
        }
      });
    }
    else if (handler === 'children') {
      // If the handler is this string, then assume that the atom is
      // a container atom and do its next child atom next
      var skip = (type === 'meta') ? 4 : 0; // special case for meta atoms
      parseAtomAt(data, offset + contentOffset + skip);
    }
    else if (handler === 'skip' || !handler) {
      // Skip the atom entirely and go on to the next one.
      // If there is no next one, call the eofHandler or just return
      parseAtomAt(data, offset + size);
    }
    else if (handler === 'done') {
      // Stop parsing
      return;
    }
  }

  function parseAtomAt(data, offset) {
    if (offset >= blob.size) {
      if (handlers.eofHandler)
        handlers.eofHandler();
      return;
    }
    else {
      data.getMore(offset, 8, parseAtom);
    }
  }
}
