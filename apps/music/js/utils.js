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

function cropImage(evt) {
  var image = evt.target;

  var parentWidth = image.parentElement.clientWidth;
  var parentHeight = image.parentElement.clientHeight;

  var childRatio = image.naturalWidth / image.naturalHeight;
  var parentRatio = parentWidth / parentHeight;
  
  // cilentWidth and clientHeight is 0 when image onloads
  if (childRatio > parentRatio) {
    image.style.width = 'auto';
    image.style.height = parentHeight + 'px';

    image.style.left = -(parentHeight * childRatio - parentWidth)/2 + 'px';
  } else {
    image.style.width = parentWidth + 'px';
    image.style.height = 'auto';

    image.style.top = -(parentWidth / childRatio - parentHeight)/2 + 'px';
  }
}
