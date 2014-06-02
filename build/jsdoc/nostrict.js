/*global exports*/
/*
 * plugin to remove strict mode before parsing to prevent getter/setter
 * parsing error. 
 */
'use strict';
exports.handlers = {
    beforeParse: function(e) {
        e.source = e.source.replace(/['"]use strict['"]/g, '//"use strict"');
    }
};
