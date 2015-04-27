'use strict';
/* global
  MediaUtils,
  ThumbnailItem
*/

/**
 * ThumbnailDateGroup is a grouping mechanism supported in gallery app. It
 * groups file data by its year and month. The grouping
 * identity is based on the groupID. Once the groupID is different, we view
 * two groups as different groups. ThumbnailDateGroup also sorts the added file
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
 *            ThumbnailItem for the supplied file data and insert it to UI.
 *            args:
 *      item: the file data object.
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
 *   getGroupID: calculate the group id for file object.
 *       item: the file data object.
 *       return: an id string.
 *   compareGroupID: Compare group ids in format group_yyyy-mm.
 *                   The format is chosen carefully so that string comparison
 *                   returns the same result as numeric comparison
 *
 */
function ThumbnailDateGroup(item) {
  if (!item) {
    throw new Error('item should not be null or undefined.');
  }

  this.thumbnails = [];
  this.groupID = ThumbnailDateGroup.getGroupID(item);
  this.date = item.date;

  // Create the DOM elements for this thumbnail group
  this.header = document.createElement('div');
  this.header.className = 'thumbnail-group-header';
  this.container = document.createElement('div');
  this.container.className = 'thumbnail-group-container';
  this.htmlNode = document.createElement('li');
  this.htmlNode.appendChild(this.header);
  this.htmlNode.appendChild(this.container);

  // Localize the date header if L10N is ready. Otherwise,
  // ThumbnailList.localize will call localize when the it becomes
  // ready or when the locale changes.
  if (navigator.mozL10n.readyState === 'complete') {
    this.localize();
  }
}

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

// Instance methods
ThumbnailDateGroup.prototype.addItem = function(item) {
  if (!item) {
    return;
  }

  var self = this;

  function getInsertPosition(thumbnail) {
    if (self.thumbnails.length === 0 ||
        thumbnail.data.date > self.thumbnails[0].data.date) {
      // This file is the first or is newer than the first one.
      // This is the most common case for new files.
      return 0;
    }
    else if (thumbnail.data.date <
             self.thumbnails[self.thumbnails.length - 1].data.date) {
      // This file is older than the last one.
      // This is the most common case when we enumerate the database.
      return self.thumbnails.length;
    }
    else {
      // Otherwise we have to search for the right insertion spot
      return MediaUtils.binarySearch(self.thumbnails,
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
  // insert thumbnail view into array
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
  URL.revokeObjectURL(thumbnail.imgNode.src);
  this.container.removeChild(thumbnail.htmlNode);
};

ThumbnailDateGroup.formatter = new navigator.mozL10n.DateTimeFormat();

ThumbnailDateGroup.prototype.localize = function() {
  var date = new Date(this.date);
  var format = navigator.mozL10n.get('date-group-header');
  var formattedDate = ThumbnailDateGroup.formatter.localeFormat(date, format);
  this.header.textContent = formattedDate;
  // Localize each of the group's thumbnails.
  this.thumbnails.forEach(function(thumbnail) { thumbnail.localize(); });
};
