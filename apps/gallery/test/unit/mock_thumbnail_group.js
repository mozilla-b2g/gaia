MockThumbnailGroup = function(item) {
  var counter = 0;
  var dummyNode = document.createElement('div');
  dummyNode.textContent = MockThumbnailGroup._GroupID;

  var thumbnails = [];

  function addItem(item) {
    var obj = {data: item.name};
    counter++;
    thumbnails.push(obj);
    return obj;
  }

  function removeItem(item) {
    counter--;
    thumbnails.pop({data: item.name});
  }

  MockThumbnailGroup._GroupMap[MockThumbnailGroup._GroupID] = {
    // api
    addItem: addItem,
    getCount: function() {return counter},
    removeItem: removeItem,
    // properties.
    groupID: MockThumbnailGroup._GroupID,
    htmlNode: dummyNode,
    thumbnails: thumbnails
  };

  return MockThumbnailGroup._GroupMap[MockThumbnailGroup._GroupID];
};

MockThumbnailGroup.getGroupID = function(video) {
  return MockThumbnailGroup._GroupID;
};

MockThumbnailGroup.compareGroupID = function(id1, id2) {
  return id1 > id2 ? 1 : (id1 < id2 ? -1 : 0);
};

MockThumbnailGroup._GroupMap = {};

MockThumbnailGroup.reset = function() {
  MockThumbnailGroup._GroupMap = {};
  delete MockThumbnailGroup._GroupID;
};

