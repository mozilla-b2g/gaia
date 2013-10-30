define(function() {
'use strict';

function MockTemplate(id) {
   if (id !== 'picker-unit-tmpl') {
     throw new Error('Only allowed Template is picker-unit-tmpl');
   }
   this.interpolate = sinon.spy(function(data) {
     return '<div class="picker-unit">' + data.unit + '</div>';
   });
};

return MockTemplate;
});
