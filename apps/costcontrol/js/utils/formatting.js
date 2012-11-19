
'use strict';

// Return a time string in format Today|Yesterday|<WeekDay>, hh:mm
// if timestamp is a valid date. If not, it returns Never.
function formatTime(timestamp) {
  if (!timestamp)
    return _('never');

  var time = timestamp.toLocaleFormat('%H:%M');
  var date = timestamp.toLocaleFormat('%a');
  var dateDay = parseInt(timestamp.toLocaleFormat('%u'), 10);
  var now = new Date();
  var nowDateDay = parseInt(now.toLocaleFormat('%u'), 10);

  if (nowDateDay === dateDay) {
    date = _('today');
  } else if ((nowDateDay === dateDay + 1) ||
            (nowDateDay === 1 && dateDay === 7)) {
    date = _('yesterday');
  }

  return date + ', ' + time;
}

// Return a balance string in format DD.XX or -- if balance is null
function formatBalance(balance) {
  var formattedBalance = '--';
  if (balance !== null) {
    var splitBalance = (balance.toFixed(2)).split('.');
    formattedBalance = '&i.&d'
      .replace('&i', splitBalance[0])
      .replace('&d', splitBalance[1]);
  }
  return formattedBalance;
}

// Format data using magnitude localization
// It exepcts a pair with the value and the unit
function formatData(dataArray) {
  return _('magnitude', { value: dataArray[0], unit: dataArray[1] });
}

// Return a fixed point data value in MG/GB
function roundData(value, positions) {
  positions = (typeof positions === 'undefined') ? 2 : positions;
  if (value < 1000)
    return [value.toFixed(positions), 'B'];

  if (value < 1000000)
    return [(value / 1000).toFixed(positions), 'KB'];

  if (value < 1000000000)
    return [(value / 1000000).toFixed(positions), 'MB'];

  return [(value / 1000000000).toFixed(positions), 'GB'];
}

// Return a padded data value in MG/GB
function padData(value) {
  var rounded = roundData(value, 0);
  var value = rounded[0];
  var len = value.length;
  switch (len) {
    case 1:
      value = '00' + value;
      break;
    case 2:
      value = '0' + value;
      break;
  }
  rounded[0] = parseInt(value, 10) ? value : '0';
  return rounded;
}

