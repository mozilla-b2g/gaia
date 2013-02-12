define('mimelib/index',['require','exports','module','./lib/mimelib','./lib/content-types','./lib/content-types-reversed'],function (require, exports, module) {

module.exports = require('./lib/mimelib');
module.exports.contentTypes = require('./lib/content-types');
module.exports.contentTypesReversed = require('./lib/content-types-reversed');
});