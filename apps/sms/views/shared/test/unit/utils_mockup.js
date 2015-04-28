/*exported getMockupedDate */

'use strict';

function getMockupedDate(diffDays) {
  var year = 2013;
  var month = 1;
  var day = 13;
  var hour = 1, minute = 1;
  return new Date(year, month, day - diffDays, hour, minute, 0);
}
