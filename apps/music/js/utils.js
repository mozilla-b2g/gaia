'use strict';

function escapeHTML(str, escapeQuotes) {
  var span = document.createElement('span');
  span.textContent = str;

  if (escapeQuotes)
    return span.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
  return span.innerHTML;
}

function formatTime(secs) {
  if (isNaN(secs))
    return;

  var formatedTime;
  var seconds = parseInt(secs % 60, 10);
  var minutes = parseInt(secs / 60) % 60;
  var hours = parseInt(secs / 3600) % 24;

  if (hours === 0) {
    formatedTime =
      (minutes < 10 ? '0' + minutes : minutes) + ':' +
      (seconds < 10 ? '0' + seconds : seconds);
  } else {

    formatedTime =
      (hours < 10 ? '0' + hours : hours) + ':' +
      (minutes < 10 ? '0' + minutes : minutes) + ':' +
      (seconds < 10 ? '0' + seconds : seconds);
  }

  return formatedTime;
}

// This function is for cropping the onloaded IMG.
// If a DIV(parent) contains a IMG(child),
// the IMG will be cropped and fitted to vertical or horizontal center.
// DIV(parent) - overflow: hidden;
// IMG(child) - position: absolute;
function cropImage(evt) {
  // Make sure we never have more than one of these registered on an image
  evt.target.removeEventListener('load', cropImage);

  var image = evt.target;
  var style = image.style;

  var parentWidth = image.parentElement.clientWidth;
  var parentHeight = image.parentElement.clientHeight;

  var childRatio = image.naturalWidth / image.naturalHeight;
  var parentRatio = parentWidth / parentHeight;

  if (childRatio > parentRatio) {
    style.width = 'auto';
    style.height = parentHeight + 'px';

    style.left = -(parentHeight * childRatio - parentWidth) / 2 + 'px';
  } else {
    style.width = parentWidth + 'px';
    style.height = 'auto';

    style.top = -(parentWidth / childRatio - parentHeight) / 2 + 'px';
  }
}

// If the metadata music file includes embedded cover art,
// use the thumbnail cache or extract it from the file,
// create a blob: url for it, and set it on the specified img element.
function createAndSetCoverURL(img, fileinfo, isCached) {
  var url;

  function setImageURL() {
    img.addEventListener('load', function revoke() {
      URL.revokeObjectURL(url);
      img.removeEventListener('load', revoke);
    });
    img.src = url;
  }

  if (isCached) {
    url = URL.createObjectURL(fileinfo.metadata.thumbnail);
    setImageURL();
  } else {
    musicdb.getFile(fileinfo.name, function(file) {
      var cover = file.slice(fileinfo.metadata.picture.start,
                             fileinfo.metadata.picture.end,
                             fileinfo.metadata.picture.type);
      url = URL.createObjectURL(cover);
      setImageURL();
    });
  }
}
