'use strict';
var View = require('../../lib/view');
var Marionette = require('marionette-client');


function System(client) {
    View.call(this, client);
}

System.prototype = Object.create(View.prototype)
System.prototype.constructor = System;


System.prototype.launch = function(){
    View.prototype.launch.call(this, this.ORIGIN);
};

System.prototype.selectors = {
    sections: {
        clockTimeSelector: {
            _rootElement: '.appWindow[data-manifest-name="Clock"] .value-selector',
            _newAlarmButton : '.value-picker-hours .picker-unit '
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

System.prototype.selectTime = function(alarmInfo) {

};


module.exports = System;
