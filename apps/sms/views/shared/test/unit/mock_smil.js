/*exported MockSMIL */

'use strict';

var MockSMIL = {
  mParsed: [{'name': 'IMG_0011.jpg', 'blob': {}}],
  parse: function ms_parse(message, callback) {
    callback && callback(this.mParsed);
  },

  generate: function ms_generate(slides) {
    return { smil: 'smil', attachments: 'attachments' };
  }
};
