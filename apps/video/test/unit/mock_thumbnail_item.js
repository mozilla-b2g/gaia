MockThumbnailItem = function(video) {
  var dummyNode = document.createElement('div');
  dummyNode.textContent = video.date;

  return {
    htmlNode: dummyNode,
    data: video
  };
};
