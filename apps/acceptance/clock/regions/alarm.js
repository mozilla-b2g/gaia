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
    _newAlarmButton : '#alarm-new',
    _rootElement: '#alarm-panel'
};

Alarm.prototype.createNewAlarm = function() {
    View.prototype.tap.call(this, this.selectors._rootElement, this.selectors._newAlarmButton);
};

Alarm.prototype.ORIGIN = 'app://clock.gaiamobile.org';

module.exports = Alarm;
