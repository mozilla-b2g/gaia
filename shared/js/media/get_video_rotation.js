'use strict';

//
// Given an MP4/Quicktime based video file as a blob, read through its
// atoms to find the track header "tkhd" atom and extract the rotation
// matrix from it. Convert the matrix value to rotation in degrees and
// pass that number to the specified callback function. If no value is
// found but the video file is valid, pass null to the callback. If
// any errors occur, pass an error message (a string) callback.
//
// See also:
// http://androidxref.com/4.0.4/xref/frameworks/base/media/libstagefright/MPEG4Writer.cpp
// https://developer.apple.com/library/mac/#documentation/QuickTime/QTFF/QTFFChap2/qtff2.html
//
function getVideoRotation(blob, rotationCallback) {

  // A utility for traversing the tree of atoms in an MP4 file
  function MP4Parser(blob, handlers) {
    // Start off with a 1024 chunk from the start of the blob.
    BlobView.get(blob, 0, Math.min(1024, blob.size), function(data, error) {
      // Make sure that the blob is, in fact, some kind of MP4 file
      if (data.byteLength <= 8 || data.getASCIIText(4, 4) !== 'ftyp') {
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
      var contentOffset = 8;                           // position of content

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
        data.getMore(offset, 16, parseAtom);
      }
    }
  }

  // We want to loop through the top-level atoms until we find the 'moov'
  // atom. Then, within this atom, there are one or more 'trak' atoms.
  // Each 'trak' should begin with a 'tkhd' atom. The tkhd atom has
  // a transformation matrix at byte 48.  The matrix is 9 32 bit integers.
  // We'll interpret those numbers as a rotation of 0, 90, 180 or 270.
  // If the video has more than one track, we expect all of them to have
  // the same rotation, so we'll only look at the first 'trak' atom that
  // we find.
  MP4Parser(blob, {
    errorHandler: function(msg) { rotationCallback(msg); },
    eofHandler: function() { rotationCallback(null); },
    defaultHandler: 'skip',  // Skip all atoms other than those listed below
    moov: 'children',        // Enumerate children of the moov atom
    trak: 'children',        // Enumerate children of the trak atom
    tkhd: function(data) {   // Pass the tkhd atom to this function
      // The matrix begins at byte 48
      data.advance(48);

      var a = data.readUnsignedInt();
      var b = data.readUnsignedInt();
      data.advance(4); // we don't care about this number
      var c = data.readUnsignedInt();
      var d = data.readUnsignedInt();

      if (a === 0 && d === 0) { // 90 or 270 degrees
        if (b === 0x00010000 && c === 0xFFFF0000)
          rotationCallback(90);
        else if (b === 0xFFFF0000 && c === 0x00010000)
          rotationCallback(270);
        else
          rotationCallback('unexpected rotation matrix');
      }
      else if (b === 0 && c === 0) { // 0 or 180 degrees
        if (a === 0x00010000 && d === 0x00010000)
          rotationCallback(0);
        else if (a === 0xFFFF0000 && d === 0xFFFF0000)
          rotationCallback(180);
        else
          rotationCallback('unexpected rotation matrix');
      }
      else {
        rotationCallback('unexpected rotation matrix');
      }
      return 'done';
    }
  });
}
