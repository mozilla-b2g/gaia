'use strict';

var PageRegion = require(
    '../../../../shared/test/integration/helpers/page_region');
var MarionetteSearchTypes = require(
    '../../../../shared/test/integration/helpers/marionette_search_types');

function Alarm(client) {
    PageRegion.call(this, client,
        Alarm.prototype.selectors._alarmViewLocator);
}

Alarm.prototype = Object.create(PageRegion.prototype);
Alarm.prototype.constructor = Alarm;


Alarm.prototype.selectors = {
    _alarmViewLocator: {'by': MarionetteSearchTypes.prototype.cssId,
        'locator': 'alarm-tab'}
};

module.exports = Alarm;

