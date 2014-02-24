define(function() {
'use strict';

function MockTemplate(id) {
   this.interpolate = sinon.spy(function(data) {
     return '<div class="picker-unit">' + data.unit + '</div>';
   });
}

return MockTemplate;
});
