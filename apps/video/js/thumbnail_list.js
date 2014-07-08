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
 *    updateAllThumbnailTitle: update all thuambnail title text.
 *    findNextFocused: find the next focused item after the file name.
 *           filename: the referenced filename.
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

ThumbnailList.prototype.updateAllThumbnailTitle = function() {
  for (var key in this.thumbnailMap) {
    this.thumbnailMap[key].updateTitleText();
  }
};

/**
 * To find the next thumbnail item after the filename. There are multiple cases:
 * 1. filename is not existed: returns the first thumbnail.
 * 2. filename is at last position, returns the previous thumbnail of filename.
 * 3. filename is at other position, returns the next thumbnail of filename.
 *
 * @param {string} filename the file name of video
 */
ThumbnailList.prototype.findNextThumbnail = function(filename) {
  var currentGroup = this.groupMap[filename];
  if (!currentGroup) {
    // the file is not in this list, return the first one.
    return this.itemGroups.length ? this.itemGroups[0].thumbnails[0] : null;
  }

  var currentThumbnail = this.thumbnailMap[filename];

  var idx;
  if (currentGroup.thumbnails.length === 1) {
    // only the deleted one, back to previous/next group;
    idx = this.itemGroups.indexOf(currentGroup);
    if (idx === 0) {
      // the delete group is the first one, set target video to first item of
      // next group.
      if (this.itemGroups.length > 1) {
        currentThumbnail = this.itemGroups[1].thumbnails[0];
      } else {
        // no more videos
        currentThumbnail = null;
      }
    } else {
      // focus previous video
      var thumbnails = this.itemGroups[idx - 1].thumbnails;
      currentThumbnail = thumbnails[thumbnails.length - 1];
    }
  } else {
    idx = currentGroup.thumbnails.indexOf(currentThumbnail);
    if (idx === 0) {
      currentThumbnail = currentGroup.thumbnails[1];
    } else {
      currentThumbnail = currentGroup.thumbnails[idx - 1];
    }
  }
  return currentThumbnail;
};
