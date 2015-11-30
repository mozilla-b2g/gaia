'use strict';
 
var MockThumbnailGroup = function(item) {
  var counter = 0;
  var dummyNode = document.createElement('div');
  dummyNode.textContent = MockThumbnailGroup._GroupID;
  dummyNode.htmlNode = dummyNode;
  dummyNode.updateTitleText = function() {};

  function addItem() {
    counter++;
    return dummyNode;
  }

  function removeItem() {
    counter--;
  }

  function localize() {}

  MockThumbnailGroup._GroupMap[MockThumbnailGroup._GroupID] = {
    // api
    addItem: addItem,
    getCount: function() {return counter;},
    removeItem: removeItem,
    localize: localize,
    // properties.
    groupID: MockThumbnailGroup._GroupID,
    htmlNode: dummyNode
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
