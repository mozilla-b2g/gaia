
'use strict';

// Return a time string in format Today|Yesterday|<WeekDay>, hh:mm
// if timestamp is a valid date. If not, it returns Never.
function formatTime(timestamp) {
  if (!timestamp) {
    return _('never');
  }

  var dateFormatter = new navigator.mozL10n.DateTimeFormat();
  var time = dateFormatter.localeFormat(timestamp, _('shortTimeFormat'));
  var date = dateFormatter.localeFormat(timestamp, '%a');
  var dateDay = parseInt(dateFormatter.localeFormat(timestamp, '%u'), 10);
  var now = new Date();
  var nowDateDay = parseInt(dateFormatter.localeFormat(now, '%u'), 10);

  if (nowDateDay === dateDay) {
    date = _('today');
  } else if ((nowDateDay === dateDay + 1) ||
            (nowDateDay === 1 && dateDay === 7)) {
    date = _('yesterday');
  }

  return navigator.mozL10n.get('day-hour-format', {
    day: date,
    time: time
  });

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

// Return a fixed point data value in KB/MB/GB
function roundData(value, positions) {
  positions = (typeof positions === 'undefined') ? 2 : positions;
  if (value < 1000) {
    return [value.toFixed(positions), 'B'];
  }

  if (value < 1000000) {
    return [(value / 1000).toFixed(positions), 'KB'];
  }

  if (value < 1000000000) {
    return [(value / 1000000).toFixed(positions), 'MB'];
  }

  return [(value / 1000000000).toFixed(positions), 'GB'];
}

function getPositions(value) {
  if (value < 10) {
    return 2;
  }
  if (value < 100) {
    return 1;
  }
  return 0;
}

function smartRound(value) {
  var positions;
  if (value < 1000) {
    return [value.toFixed(getPositions(value)), 'B'];
  }

  if (value < 1000000) {
    var kbytes = value / 1000;
    return [kbytes.toFixed(getPositions(kbytes)), 'KB'];
  }

  if (value < 1000000000) {
    var mbytes = value / 1000000;
    return [mbytes.toFixed(getPositions(mbytes)), 'MB'];
  }

  var gbytes = value / 1000000000;
  return [gbytes.toFixed(getPositions(gbytes)), 'GB'];
}

// Return a padded data value in MG/GB
function padData(v) {
  var rounded = roundData(v, 0);
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

// Given the API information compute the human friendly minutes
function computeTelephonyMinutes(activity) {
  // Right now the activity for telephony is computed in milliseconds
  return Math.ceil(activity.calltime / 60000);
}

