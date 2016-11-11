'use strict';
var View = require('../../lib/view');
var Marionette = require('marionette-client');


function Alarm(client) {
    View.call(this, client);
}

Alarm.prototype = Object.create(View.prototype)
Alarm.prototype.constructor = Alarm;


Alarm.prototype.launch = function(){
    View.prototype.launch.call(this, this.ORIGIN);
};

Alarm.prototype.selectors = {
    sections: {
            main: {
                _rootElement: '#alarm-panel',
                _newAlarmButton : '#alarm-new'
            },
            editAlarm: {
                _rootElement: '#edit-alarm',
                _alarmName: '#alarm-name',
                _timeSelect: '#time-select',
                _repeatSelect: '#repeat-select',
                _soundSelect: '#sound-select',
                _vibrateCheckbox: '#vibrate-checkbox',
                _snoozeSelect: '#snooze-select',
                _alarmInput: '#alarm-volume-input',
                _deleteButton: '#alarm-delete'
            }
        }
};

Alarm.prototype.createNewAlarm = function(alarmInfo) {
    var selectorObject = {};
    selectorObject.root = this.selectors.sections.main._rootElement;
    selectorObject.element = this.selectors.sections.main._newAlarmButton;
    View.prototype.tap.call(this, selectorObject);
    selectorObject.root = this.selectors.sections.editAlarm._rootElement;
    selectorObject.element = this.selectors.sections.editAlarm._alarmName;
    View.prototype.tap.call(this, selectorObject);
    View.prototype.sendKeys.call(this, selectorObject,alarmInfo.name);
    //Hit the return key. See sendkeys.js for the different codes for special keys. dxr.mozilla.org
    View.prototype.sendKeys.call(this, selectorObject,'\uE006');
    selectorObject.element = this.selectors.sections.editAlarm._timeSelect;
    View.prototype.tap.call(this, selectorObject);
    View.prototype.switchToSystemApp(this);
    View.prototype.sendKeys.call(this, selectorObject, "12:30 am");

};


Alarm.prototype.ORIGIN = 'app://clock.gaiamobile.org';

module.exports = Alarm;
