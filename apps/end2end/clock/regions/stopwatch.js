'use strict';

var PageRegion = require(
    '../../../../shared/test/integration/helpers/page_region');
var MarionetteSearchTypes = require(
    '../../../../shared/test/integration/helpers/marionette_search_types');

function Stopwatch(client) {
    PageRegion.call(this, client,
        Stopwatch.prototype.selectors._stopwatchPanelLocator);
    var viewLocator = this.findElement(
        Stopwatch.prototype.selectors._stopwatchPanelLocator);
    this.client.waitFor(function() {
            return viewLocator.displayed() && viewLocator.rect().x === 0;
        }
    );
}

Stopwatch.prototype = Object.create(PageRegion.prototype);
Stopwatch.prototype.constructor =  Stopwatch;

Stopwatch.prototype.selectors = {
    _stopwatchPanelLocator : {'by':MarionetteSearchTypes.prototype.cssId ,
        'locator': 'stopwatch-panel' },
    _stopwatchTimeLocator : {'by': MarionetteSearchTypes.prototype.cssSelector,
        'locator': '.stopwatch-time'},
    _stopwatchStartLocator: {'by': MarionetteSearchTypes.prototype.cssSelector,
        'locator': '#stopwatch-controls .stopwatch-start'},
    _stopwatchPauseLocator: {'by': MarionetteSearchTypes.prototype.cssSelector,
        'locator': '#stopwatch-controls .stopwatch-pause'},
    _stopwatchResetLocator: {'by': MarionetteSearchTypes.prototype.cssSelector,
        'locator': '#stopwatch-controls .stopwatch-reset'},
    _stopwatchResumeLocator: {'by': MarionetteSearchTypes.prototype.cssSelector,
        'locator': '#stopwatch-controls .stopwatch-resume'},
    _stopwatchLapLocator: {'by': MarionetteSearchTypes.prototype.cssSelector,
        'locator': '#stopwatch-controls .stopwatch-lap'}
};

Stopwatch.prototype.getDisplayedTime = function() {
    var currentTime = this.findElement(
        Stopwatch.prototype.selectors._stopwatchTimeLocator);
    return currentTime.text();
};

Stopwatch.prototype.tapStart = function() {
    this.tap(Stopwatch.prototype.selectors._stopwatchStartLocator);
};

Stopwatch.prototype.tapPause = function() {
    this.tap(Stopwatch.prototype.selectors._stopwatchPauseLocator);
};

Stopwatch.prototype.tapReset = function() {
    this.tap(Stopwatch.prototype.selectors._stopwatchResetLocator);
};

Stopwatch.prototype.tapResume = function() {
    this.tap(Stopwatch.prototype.selectors._stopwatchResumeLocator);
};

Stopwatch.prototype.tapLap = function() {
    this.tap(Stopwatch.prototype.selectors._stopwatchLapLocator);
};

module.exports = Stopwatch;

