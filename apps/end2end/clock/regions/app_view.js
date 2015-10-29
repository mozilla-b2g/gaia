'use strict';
var View = require('../../../../shared/test/integration/helpers/view');
var AlarmView = require('./alarm');
var TimerView = require('./timer');
var StopwatchView = require('./stopwatch');

function ClockView(client) {
    View.call(this, client);
}

ClockView.prototype = Object.create(View.prototype);
ClockView.prototype.constructor = ClockView;

ClockView.prototype.launch = function(){
    View.prototype.launch.call(this, this.ORIGIN);
    this.waitForDisplay(ClockView.prototype.selectors._visibleClockLocator);
};




ClockView.prototype.selectors = {
    _visibleClockLocator : {'by':'css selector',
        'locator': '#clock-view .visible' },
    _stopwatchTabLocator: {'by':'id', 'locator':'stopwatch-tab'},
    _alarmTabLocator: {'by':'id', 'locator': 'alarm-tab'},
    _timerTabLocator: {'by':'id', 'locator': 'timer-tab'}
};

ClockView.prototype.switchView = function(viewName){
    if(viewName === 'stopwatch'){
        this.tap(ClockView.prototype.selectors._stopwatchTabLocator);
        return new StopwatchView(this.client);
    } else if(viewName === 'alarm'){
        this.waitForDisplay(ClockView.prototype.selectors._alarmTabLocator);
        this.tap(ClockView.prototype.selectors._alarmTabLocator);
        return new AlarmView(this.client);
    } else if(viewName === 'timer'){
        this.tap(ClockView.prototype.selectors._timerTabLocator);
        return new TimerView(this.client);
    } else {
        throw viewName +  ' is not a view that you can switch to.';
    }
};


ClockView.prototype.ORIGIN = 'app://clock.gaiamobile.org';

module.exports = ClockView;
