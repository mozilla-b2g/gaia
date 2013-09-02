/**
 * ThumbnailList is the class reponsible for rendering all video data in to a
 * list. It uses GroupClass to group and sort video data as ThumbnailItem.
 *
 * Constructor:
 *    groupClass: the grouping class. We only have ThumbnailDataGroup, now.
 *    container: the HTML DOM object for containing everything.
 *
 * API:
 *    addItem: add a video data and render it.
 *        item: the video data to add.
 *    removeItem: remove a ThumbnailItem.
 *        filename: the filename of video data.
 *    getCount: returns the total video data in this list.
 *    isPickMode: returns if ThumbnailList is in pick mode.
 *    setPickMode: set ThumbnailList as pick mode or not.
 *    isSelectMode: returns if ThumbnailList is in selection mode.
 *    setSelectMode: set ThumbnailList as selection mode or not.
 *    reset: clears all the internal data structure.
 *
 * Properties:
 *    thumbnailMap: a mapping of filename to ThumbnailItem.
 *    groupMap: a mapping of filename to thumbnail group.
 *    itemGroups: an sorted array of thumbnail group.
 *    count: the total ThumbnailItem in this list.
 *    groupClass: the grouping class this list used.
 *    container: the HTML DOM element containing this list.
 */
function ThumbnailList(groupClass, container) {
  if (!groupClass || !container) {
    throw new Error('group class or container cannot be null or undefined');
  }
  // the filename to ThumbnailItem map
  this.thumbnailMap = {};
  // the filename to group
  this.groupMap = {};
  // the group list
  this.itemGroups = [];
  this.count = 0;
  this.groupClass = groupClass;
  this.container = container;
}

ThumbnailList.prototype.addItem = function(item) {
  if (!item) {
    return null;
  }

  if (this.thumbnailMap[item.name]) {
    return this.thumbnailMap[item.name];
  }

  var _this = this;

  function createItemGroup(item, before) {
    var group = new _this.groupClass(item);

    _this.container.insertBefore(group.htmlNode,
                                 before ? before.htmlNode : null);
    return group;
  }

  function getItemGroup(item) {
    var groupID = _this.groupClass.getGroupID(item);
    var i;
    for (i = 0; i < _this.itemGroups.length; i++) {
      if (_this.itemGroups[i].groupID === groupID) {
        return _this.itemGroups[i];
      } else if (_this.groupClass.compareGroupID(_this.itemGroups[i].groupID,
                                                 groupID) < 0) {
        // existing ID is less than current groupID, stop searching/
        break;
      }
    }
    var createdGroup = createItemGroup(item, _this.itemGroups[i]);
    _this.itemGroups.splice(i, 0, createdGroup);
    return createdGroup;
  }

  var group = getItemGroup(item);
  var thumbnail = group.addItem(item);
  this.groupMap[item.name] = group;
  this.thumbnailMap[item.name] = thumbnail;
  this.count++;
  return thumbnail;
};

ThumbnailList.prototype.removeItem = function(filename) {
  if (!this.thumbnailMap[filename]) {
    return;
  }

  var group = this.groupMap[filename];
  group.removeItem(this.thumbnailMap[filename]);
  if (!group.getCount()) {
    this.container.removeChild(group.htmlNode);
    this.itemGroups.splice(this.itemGroups.indexOf(group), 1);
  }
  this.count--;
  delete this.groupMap[filename];
  delete this.thumbnailMap[filename];
};

ThumbnailList.prototype.reset = function() {
  for (var name in this.thumbnailMap) {
    this.groupMap[name].removeItem(this.thumbnailMap[name]);
  }
  this.container.innerHTML = '';
  this.thumbnailMap = {};
  this.itemGroups = [];
  this.groupMap = {};
  this.count = 0;
};

ThumbnailList.prototype.isPickMode = function() {
  return this.container.classList.contains('pick');
};

ThumbnailList.prototype.setPickMode = function(pick) {
  if (pick) {
    this.container.classList.add('pick');
  } else {
    this.container.classList.remove('pick');
  }
};

ThumbnailList.prototype.isSelectMode = function() {
    return this.container.classList.contains('select');
};

ThumbnailList.prototype.setSelectMode = function(select) {
  if (select) {
    this.container.classList.add('select');
  } else {
    this.container.classList.remove('select');
  }
};
