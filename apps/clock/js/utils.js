'use strict';

function escapeHTML(str, escapeQuotes) {
  var span = document.createElement('span');
  span.textContent = str;

  if (escapeQuotes)
    return span.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
  return span.innerHTML;
}

function summarizeDaysOfWeek(bitStr) {
  if (bitStr == '')
    return 'None';

  var DAYSOFWEEK = new Array('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun');
  // Formate bits: 0123456(0000000)
  // Case: Everyday:  1111111
  // Case: Weekdays:  1111100
  // Case: Weekends:  0000011
  // Case: Never:     0000000
  // Case: Specific:  other case  (Mon, Tue, Thu)

  var summary = '';
  switch (bitStr)
  {
  case '1111111':
    summary = 'Everyday';
    break;
  case '1111100':
    summary = 'Weekdays';
    break;
  case '0000011':
    summary = 'Weekends';
    break;
  case '0000000':
    summary = 'Never';
    break;
  default:
    for (var i = 0; i < bitStr.length; i++) {
      summary += bitStr.substr(i, 1) == '1' ? DAYSOFWEEK[i] + ', ' : '';
    }
    summary = summary.slice(0, summary.lastIndexOf(','));
  }
  return summary;
}
