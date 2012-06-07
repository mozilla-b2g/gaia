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
  var minutes = Math.floor(secs / 60);
  var seconds = Math.floor(secs % 60);

  if (minutes.toString().length < 2)
    minutes = '0' + minutes;
  if (seconds.toString().length < 2)
    seconds = '0' + seconds;

  formatedTime = minutes + ':' + seconds;

  return formatedTime;
}
