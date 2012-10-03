
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
