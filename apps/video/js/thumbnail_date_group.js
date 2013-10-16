/**
 * ThumbnailDateGroup is a grouping mechanism supported in video app. It
 * groups video data by its year and month, see bug 908380. The grouping
 * identity is based on the groupID. Once the groupID is different, we view
 * two groups as different groups. ThumbnailDateGroup also sorts the added video
 * data descendant. We can just put a item into group and let it sort the list.
 *
 * Before use it, we need to initialize the static property Template with
 * template.js object. It is used when rendering group header, the HTML DOM
 * node of this object. The initialization may look like this:
 *
 *    `ThumbnailDateGroup.Template = new Template('thumbnail-group-header');`
 *
 *
 * The HTML Node of this object contains all UI of its children. If we move it,
 * all items under this group are also moved.
 *
 * CONSTRUCTOR:
 *   To create a group, we need to supply one argument:
 *      item: the first data object for this group. It will be used for
 *            rendering the information about this group.
 *
 * API:
 *   addItem(): add a new item to this group. ThumbnailDateGroup will create a
 *            ThumbnailItem for the supplied video data and insert it to UI.
 *            args:
 *      item: the video data object.
 *      return: ThumbnailItem object
 *   removeItem(): remove a ThumbnailItem from this group. It also removes the
 *               UI from this group.
 *      thumbnail: ThumbnailItem object to remove.
 *   getCount(): returns the total items in this group
 *
 * Properties:
 *   htmlNode: the HTML DOM node of this group.
 *   groupID: the ID of this group.
 *   thumbnails: all ThumbnailItem objects under this group.
 *
 * Static API:
 *   getGroupID: calculate the group id for video object.
 *       item: the video data object.
 *       return: an id string.
 *   compareGroupID
 *
 */
function ThumbnailDateGroup(item) {
  if (!item) {
    throw new Error('item should not be null or undefined.');
  }

  this.thumbnails = [];
  this.groupID = ThumbnailDateGroup.getGroupID(item);
  this.htmlNode = null;
  this.container = null;

  var _this = this;

  render();

  function render() {
    if (!ThumbnailDateGroup.Template) {
      throw new Error('template is required while rendering.');
    }

    var dateFormatter = new navigator.mozL10n.DateTimeFormat();
    var htmlText = ThumbnailDateGroup.Template.interpolate({
      'group-header': dateFormatter.localeFormat(new Date(item.date),
                                                 '%B %Y')});

    // create dummy node for converting to DOM node.
    var dummyDiv = document.createElement('DIV');
    dummyDiv.innerHTML = htmlText;
    var domNode = dummyDiv.firstElementChild;

    if (!domNode) {
      throw new Error('the template is empty');
    }
    _this.htmlNode = domNode;
    _this.container = domNode.querySelector('.thumbnail-group-container');
  }
}

// static functions
ThumbnailDateGroup.getGroupID = function(item) {
  // id is group_yyyy-mm. this id will be used as a key
  var dateObj = new Date(item.date);
  var month = dateObj.getMonth() + 1;
  return 'group_' + dateObj.getFullYear() + '-' +
         (month < 10 ? '0' + month : month);
};

ThumbnailDateGroup.compareGroupID = function(id1, id2) {
  return id1 > id2 ? 1 : (id1 < id2 ? -1 : 0);
};

// class functions
ThumbnailDateGroup.prototype.addItem = function(item) {
  if (!item) {
    return;
  }

  var _this = this;

  function getInsertPosition(thumbnail) {
    if (_this.thumbnails.length === 0 ||
        thumbnail.data.date > _this.thumbnails[0].data.date) {
      // This video is the first or is newer than the first one.
      // This is the most common case for new videos.
      return 0;
    }
    else if (thumbnail.data.date <
             _this.thumbnails[_this.thumbnails.length - 1].data.date) {
      // This video is older than the last one.
      // This is the most common case when we enumerate the database.
      return _this.thumbnails.length;
    }
    else {
      // Otherwise we have to search for the right insertion spot
      return MediaUtils.binarySearch(_this.thumbnails,
                                     thumbnail,
                                     function(a, b) {
                                       return b.data.date - a.data.date;
                                     });
    }
  }

  var thumbnail = new ThumbnailItem(item);
  // calculate the position.
  var insertPosition = getInsertPosition(thumbnail);
  // put into DOM tree.
  this.container.insertBefore(thumbnail.htmlNode,
                              this.container.children[insertPosition]);
  // insert thumbnail view into array.
  this.thumbnails.splice(insertPosition, 0, thumbnail);
  return thumbnail;
};

ThumbnailDateGroup.prototype.getCount = function() {
  return this.thumbnails.length;
};

ThumbnailDateGroup.prototype.removeItem = function(thumbnail) {
  var idx = this.thumbnails.indexOf(thumbnail);
  if (idx < 0) {
    return;
  }
  this.thumbnails.splice(idx, 1);
  this.container.removeChild(thumbnail.htmlNode);
};
