/* exported MockThumbnailItem */
'use strict';

var MockThumbnailItem = function(video) {
  var dummyNode = document.createElement('div');
  dummyNode.textContent = video.date;
  var titleMaxLines;

  return {
    htmlNode: dummyNode,
    data: video,
    titleMaxLines: titleMaxLines,
    updateTitleText: function() {}
  };
};
