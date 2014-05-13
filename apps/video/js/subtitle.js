
// Set up default subtitle file for videos
var getSubtitle = function(videoinfo, metadata) {
  var title = videoinfo.name.split('.');
  var vttPath = title[0].concat('.vtt');
  var sdcard = navigator.getDeviceStorage('sdcard');
  var requestVTT = sdcard.get(vttPath);
  var reader = new FileReader();
  requestVTT.onerror = function() {
    var srtPath = title[0].concat('.srt');
      var requestSRT = sdcard.get(srtPath);
      requestSRT.onsuccess = function() {
        var fileSRT = this.result;
        reader.onloadend = function(e) {
          // Do conversion for srt to webvtt
          vttContent = 'WEBVTT\n\n' + (e.target.result).replace(/,/g, '.');
          metadata.subtitles = {
            default: {
              timestamp: fileSRT.lastModifiedDate,
              blob: new Blob([vttContent], { type: 'text/html' })
            }
          };
        };
        reader.readAsBinaryString(fileSRT);
      };
      requestSRT.onerror = function() {
        //Do nothing
      };
    };
    requestVTT.onsuccess = function() {
      var fileVTT = this.result;
      // Read content
      reader.onloadend = function(e) {
        metadata.subtitles = {
          default: {
            timestamp: fileVTT.lastModifiedDate,
            blob: new Blob([e.target.result], { type: 'text/html' })
          }
        };
      };
      reader.readAsBinaryString(fileVTT);
    };
};

// Update metadata in db.js after modification or remove of subtitle files
var updateSubtitle = function(videoinfo) {
  var metadata = videoinfo.metadata;
  if (metadata.subtitles === undefined) {
    addToMetadataQueue(videoinfo);
      return;
  }
  else if (metadata.subtitles !== undefined) {
    // Update subtitles info
    var metadataTime = Date.parse(metadata.subtitles.default.timestamp);
    var title = videoinfo.name.split('.');
    var subtitleVTT = title[0].concat('.vtt');
    var sdcard = navigator.getDeviceStorage('sdcard');
    var checkVTT = sdcard.get(subtitleVTT);
    checkVTT.onsuccess = function() {
      var fileVTT = this.result;
      if (metadataTime !== Date.parse(fileVTT.lastModifiedDate)) {
        addToMetadataQueue(videoinfo);
      }
    };
    checkVTT.onerror = function() {
      // check srt
      var subtitleSRT = title[0].concat('.srt');
      var checkSRT = sdcard.get(subtitleSRT);
      checkSRT.onsuccess = function() {
        var fileSRT = this.result;
        if (metadataTime != Date.parse(fileSRT.lastModifiedDate)) {
          addToMetadataQueue(videoinfo);
        }
      };
      checkSRT.onerror = function() {
        // Here means the subtitle file was removed
        videoinfo.metadata.subtitles = undefined;
      };
    };
  }
};
