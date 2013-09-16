/*exported MockSMIL */

'use strict';

var MockSMIL = {
  parse: function ms_parse(message, callback) {},

  generate: function ms_generate(slides) {
    return { smil: 'smil', attachments: 'attachments' };
  }
};
