!function() {

const OUTPUT_NOTIFY_PREF = 'accessibility.accessfu.notify_output';
const ACTIVATE_PREF = 'accessibility.accessfu.activate';

function ScreenReader() {
  Components.utils.import("resource://gre/modules/accessibility/AccessFu.jsm");
  Components.utils.import('resource://gre/modules/Services.jsm');
}

ScreenReader.prototype = {
  toggle: function toggle(enabled) {
    Services.prefs.setIntPref(ACTIVATE_PREF, enabled ? 1 : 0);

    if (enabled) {
      if (Services.prefs.prefHasUserValue(OUTPUT_NOTIFY_PREF)) {
        this._previousOutputPref = Services.prefs.getBoolPref(OUTPUT_NOTIFY_PREF);
      } else {
        delete this._previousOutputPref;
      }
      Services.prefs.setBoolPref(OUTPUT_NOTIFY_PREF, true);
      Services.obs.addObserver(this, 'accessfu-output', false);
    } else {
      if (this._previousOutputPref == undefined) {
        Services.prefs.clearUserPref(OUTPUT_NOTIFY_PREF);
      } else if (!this._previousOutputPref){
        Services.prefs.setBoolPref(OUTPUT_NOTIFY_PREF, false);
      }
      Services.obs.removeObserver(this, 'accessfu-output');
    }
  },

  start: function start() {
  },

  observe: function observe(aSubject, aTopic, aData) {
    if (aTopic != 'accessfu-output')
      return;

    var data = JSON.parse(aData);

    for (var i in data) {
      if (!data[i])
        continue;

      if (data[i].type == 'Speech') {
        var actions = data[i].details.actions;

        for (var ii in actions) {
          if (actions[ii].method == 'speak') {
            var output = window.document.getElementById('sr-output');
            var item = output.appendItem(actions[ii].data);
            output.ensureElementIsVisible(item);
          }
        }
      }
    }
  },

  next: function next() {
    AccessFu.Input.moveCursor('moveNext', 'Simple', 'gesture');
  },

  previous: function previous() {
    AccessFu.Input.moveCursor('movePrevious', 'Simple', 'gesture');
  },

  activate: function activate() {
    AccessFu.Input.activateCurrent();
  },

  scrollLeft: function scrollLeft() {
    AccessFu.Input.scroll(1, true);
  },

  scrollRight: function scrollRight() {
    AccessFu.Input.scroll(-1, true);
  },

  scrollUp: function scrollUp() {
    AccessFu.Input.scroll(1);
  },

  scrollDown: function scrollDown() {
    AccessFu.Input.scroll(-1);
  },

  _speechService: null
};
window.screenReader = new ScreenReader();

}();
