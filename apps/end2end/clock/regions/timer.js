'use strict';

var PageRegion = require(
    '../../../../shared/test/integration/helpers/page_region');
var MarionetteSearchTypes = require(
    '../../../../shared/test/integration/helpers/marionette_search_types');

function Timer(client) {
    PageRegion.call(this, client,
        Timer.prototype.selectors._timerViewLocator);
}
Timer.prototype = Object.create(PageRegion.prototype);
Timer.prototype.constructor = Timer;


Timer.prototype.selectors = {
    _timerViewLocator : {'by': MarionetteSearchTypes.prototype.cssId,
        'locator': 'timer-panel' }
};

module.exports = Timer;
