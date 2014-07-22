/**
 * This file contains functions responsible for scrolling
 * the thumbnails on orientation change
 *
 */
/* globals thumbnails, thumbnailList */
/* exported scrollHandler, setOffsetPostition */
'use strict';

// Thumbnail size and thumbnails count in a row
var thumbnailWidth, thumbnailHeight, thumbnailsCountInRow;
// Scrolled distance of a thumbnail from parent top
var scrollOffset;

function getThumbnailSizeAndCount() {
  // This function gets called when the phone orientation changes.
  // That causes the thumbnail size and arrangement to change,
  // Here we calculate how big they are
  // and how many are in each row.
  var thumbnail = thumbnails.querySelector('.thumbnail');
  if (thumbnail) {
    thumbnailHeight = thumbnail.offsetHeight;
    thumbnailWidth = thumbnail.offsetWidth;
    thumbnailsCountInRow = Math.round(thumbnails.clientWidth / thumbnailWidth);
  }
}

function scrollHandler(evt) {
  // populate thumbnail Size and count on first scroll
  if (!thumbnailWidth || !thumbnailHeight || !thumbnailsCountInRow) {
    getThumbnailSizeAndCount();
  }
  scrollOffset = thumbnails.scrollTop;
}

function calculateHeadersHeight(index) {
  // This function returns combined group header height
  // of all headers above the thumbnail at index position
  var headersHeight = 0;
  var headersCount = 0;
  var thumbnailsCount = 0;

  //Access groups in thumbnailList
  var groups = thumbnailList.itemGroups;
  if (!groups) {
    console.error('Groups does not exist in thumbnail List');
    return -1;
  }

  // Get the thumbnail count in each group and keep adding
  // the count till combine thumbnail count is greater than index
  // Increment headerCount for each group
  for (var n = 0; n < groups.length; n++) {
    thumbnailsCount += groups[n].getCount();
    headersCount++;
    if (thumbnailsCount > index) {
      break;
    }
  }

  var header = thumbnails.querySelector('.thumbnail-group-header');
  if (header) {
    headersHeight = headersCount * header.offsetHeight;
  }
  return headersHeight;
}

function setOffsetPostition() {
  if (!thumbnailWidth || !thumbnailHeight || !thumbnailsCountInRow) {
    return;
  }

  // Get index of a thumbnail on screen
  // to find out group headers above the visibile thumbnails
  var rowNum = Math.floor(scrollOffset / thumbnailHeight);
  var idx = rowNum * thumbnailsCountInRow;

  // Get the combine header height above idx position thumbnail
  var headersHeight = calculateHeadersHeight(idx);

  // Adjust the scrolloffset by taking out
  // the combine header height
  if (scrollOffset > headersHeight) {
    scrollOffset -= headersHeight;
  }

  // Calculate the previous orientation top thumbnail row number
  // and upper left thumbnail Index
  var prevFocusRowNumber = Math.floor(scrollOffset / thumbnailHeight);
  var upperLeftThumbnailIdx = prevFocusRowNumber * thumbnailsCountInRow;

  // Change in phone orientation changes thumbnail size and count
  // Get the new thumbnail size and count in each row
  getThumbnailSizeAndCount();

  // Row number of upper left thumbnail after orientation change
  var newFocusRowNum = Math.floor(upperLeftThumbnailIdx / thumbnailsCountInRow);

  // Set the offset position to keep the upper left thumbnail in
  // focus in new orientation
  thumbnails.scrollTop = (newFocusRowNum * thumbnailHeight) + headersHeight;
}
