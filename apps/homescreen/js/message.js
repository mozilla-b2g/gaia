
'use strict';

var Message = function Message(type, data) {
  this.type = type;
  this.data = data;
};

Message.Type = {
  'ADD_BOOKMARK': 0
};
