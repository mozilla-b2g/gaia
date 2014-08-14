'use strict';

/* global DownloadableList */

// Since there isn't a KeyboardSettingsApp yet we bootstrap the
// dictionary download list directly here.
//
// XXX There should be some connection between settings and
// dictionary download UI -- for example, we shouldn't window.close()
// when we are downloading something.
(function(exports) {

var list = new DownloadableList();
list.start();

// Expose for JS Console.
exports.list = list;

})(window);
