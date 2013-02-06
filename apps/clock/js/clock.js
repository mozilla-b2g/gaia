'use strict';

// Set the 'lang' and 'dir' attributes to <html> when the page is translated
window.addEventListener('localized', function localized() {
  document.documentElement.lang = navigator.mozL10n.language.code;
  document.documentElement.dir = navigator.mozL10n.language.direction;
  ClockView.init();
  AlarmList.init();
  ActiveAlarmController.init();
});

