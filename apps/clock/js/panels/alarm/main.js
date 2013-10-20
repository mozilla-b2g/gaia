define(function(require) {
'use strict';

function AlarmPanel() {
  Panel.apply(this, arguments);

  this.element.innerHTML = html;
  ClockView.init();
  AlarmList.init();
  ActiveAlarm.init();
}
return AlarmPanel;
});
