
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

// Return a fixed point data value in MG/GB
function roundData(value) {
  if (value < 1000000000)
    return [(value / 1000000).toFixed(2), 'MB'];

  return [(value / 1000000000).toFixed(2), 'GB'];
}

// Return a padded data value in MG/GB
function padData(value) {
  if (value === 0)
    return ['0', 'MB'];

  value = value / 1000000;

  var unit = 'GB';
  if (value < 1000) {
    var floorValue = value < 10 ? Math.floor(value) :
                                  Math.floor(10 * value) / 10;
    unit = 'MB';
    var str = floorValue.toFixed() + '';
    switch (str.length + 1 + unit.length) {
      case 2:
        return ['00' + str, unit];
      case 3:
        return ['0' + str, unit];
      default:
        return [str, unit];
    }
  }

  return [(value / 1000).toFixed(1), unit];
}

