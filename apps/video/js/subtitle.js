'use strict';

var SubtitleHandler = function(){
  // Constructor of subtitleHandler
};

SubtitleHandler.prototype.setSubtitle = function(metadata, videoinfo){
  // Set up default subtitle file for videos.
  var title = videoinfo.name.split('.');
  var vttPath = title[0].concat('.vtt');
  var sdcard = navigator.getDeviceStorage('sdcard');
  var requestVTT = sdcard.get(vttPath);
  var reader = new FileReader();
  requestVTT.onerror = function() {
    // If no vtt file found, check if srt file exists.
    var srtPath = title[0].concat('.srt');
    var requestSRT = sdcard.get(srtPath);
    requestSRT.onsuccess = function() {
      // "this" here is requestSRT
      var fileSRT = this.result;
      reader.onloadend = function(e) {
        // Do conversion for srt to webvtt.
        var vttContent = 'WEBVTT\n\n' + (e.target.result).replace(/,/g, '.');
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
      // Both VTT and SRT file could not found.
      console.log('No subtitle files found.');
    };
  };
  requestVTT.onsuccess = function() {
    var fileVTT = this.result;
    // Read content from vtt file
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

SubtitleHandler.prototype.updateSubtitle = function(videoinfo, callback) {
  // Update metadata in db.js after modification or remove of subtitle files
  var metadata = videoinfo.metadata;
  if (metadata.subtitles === undefined) {
    callback(videoinfo);
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
        callback(videoinfo);
      }
    };
    checkVTT.onerror = function() {
      // Check if srt exists and should be updated.
      var subtitleSRT = title[0].concat('.srt');
      var checkSRT = sdcard.get(subtitleSRT);
      checkSRT.onsuccess = function() {
        var fileSRT = this.result;
        if (metadataTime != Date.parse(fileSRT.lastModifiedDate)) {
          callback(videoinfo);
        }
      };
      checkSRT.onerror = function() {
        // Here means the subtitle file was removed.
        videoinfo.metadata.subtitles = undefined;
      };
    };
  }
};
