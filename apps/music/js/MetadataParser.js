'use strict';
// Supported AAC formats
var aacExtensions = ['.m4a', '.m4b', '.m4p', '.m4v',
                     '.m4r', '.3gp', '.mp4', '.aac'];

function isSupportedAAC(extension) {
  var isSupported = false;

  for (var i in aacExtensions) {
    if (extension === aacExtensions[i])
      isSupported = true;

      break;
  }

  return isSupported;
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
    // Meta-data parsing of mp3 and ogg files
    // On B2G devices, file.type of mp3 format is missing
    // use file extension instead of file.type
    var extension = file.name.slice(-4);
    var metadata = {};

    if (extension === '.mp3' || isSupportedAAC(extension)) {

      ID3.loadTags(file.name, function() {
        var tags = ID3.getAllTags(file.name);

        metadata.album = tags.album;
        metadata.artist = tags.artist;
        metadata.title = tags.title || splitFileName(file.name);
        metadata.picture = tags.picture;

        callback(metadata);
        console.log('tags.title: ' + tags.title);
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
