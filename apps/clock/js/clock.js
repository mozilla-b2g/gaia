'use strict';



// Set the 'lang' and 'dir' attributes to <html> when the page is translated
window.addEventListener('localized', function localized() {
  function initialize() {
    document.documentElement.lang = navigator.mozL10n.language.code;
    document.documentElement.dir = navigator.mozL10n.language.direction;
    ClockView.init();
    AlarmList.init();
    ActiveAlarm.init();
  }

  if (!navigator.mozAlarms) {
    var mocks = ['test/unit/mocks/mock_mozAlarm.js'];
    LazyLoader.load(mocks, function() {
      navigator.mozAlarms = new MockMozAlarms(function() {});

      initialize();
    });
    return;
  } else {
    setTimeout(initialize);
  }
});
