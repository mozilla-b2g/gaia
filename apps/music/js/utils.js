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

function createBase64URL(image) {
  return 'data:' + image.format + ';base64,' + Base64.encodeBytes(image.data);
}
