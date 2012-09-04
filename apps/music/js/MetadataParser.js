'use strict';
// Supported AAC formats
var aacExtensions = ['.m4a', '.m4b', '.m4p', '.m4v',
                     '.m4r', '.3gp', '.mp4', '.aac'];

function isSupportedAAC(extension) {
  return (aacExtensions.indexOf(extension) != -1);
}


// Given an audio file, pass an object of metadata to the callback function
// or pass an error message to the errback function.
// The metadata object will look like this:
// {
//    album:     /* song album */,
//    artist:    /* song artist */,
//    title:     /* song title */,
// }
//
var metadataParser = (function() {

  function metadataParser(file, callback, errback) {
    // Meta-data parsing of mp3, ogg and aac files
    // On B2G devices, file.type of mp3 format is missing
    // use file extension instead of file.type
    var extension = file.name.slice(-4);
    var metadata = {};

    if (extension === '.mp3' || isSupportedAAC(extension)) {

      ID3.loadTags(file.name, function() {
        var tags = ID3.getAllTags(file.name);

        // XXX Some ID3 tags does not return in string
        // should be an issue of the external library (id3-minimized.js)
        // add empty string to convert them
        // or it can not be recorded into the mediadb
        metadata.album = tags.album + '';
        metadata.artist = tags.artist + '';
        metadata.title = tags.title + '' || splitFileName(file.name);
        metadata.picture = tags.picture;

        callback(metadata);
      }, {
        tags: ['album', 'artist', 'title', 'picture'],
        dataReader: FileAPIReader(file)
      });

    } else if (extension === '.ogg') {
      var oggfile = new OggFile(file, function() {

        metadata.album = oggfile.metadata.ALBUM;
        metadata.artist = oggfile.metadata.ARTIST;
        metadata.title = oggfile.metadata.TITLE;

        callback(metadata);
      });
      oggfile.parse();
    } else {
      console.log('Not supported audio file');
      errback();
    }
  }

  return metadataParser;
}());
