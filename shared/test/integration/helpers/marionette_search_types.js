'use strict';

function MarionetteSearchTypes() {}

MarionetteSearchTypes.prototype = {
    cssSelector : 'css selector',
    xpath : 'xpath',
    cssClass : 'class name',
    name : 'name',
    cssId : 'id',
    tagName : 'tag name',
    linkText : 'link text',
    partialLinkText : 'partial link text'
};

module.exports = MarionetteSearchTypes;
