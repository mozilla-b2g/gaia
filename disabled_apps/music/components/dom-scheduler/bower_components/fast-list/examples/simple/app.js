/*global DataSource, FastList*/

var content = document.getElementById('content');
var data = createDummyData(1000);
var dataSource = new DataSource(data);
var list = new FastList(content, dataSource);

function createDummyData(count) {
  var result = [];

  for (var i = 0; i < count; i++) {
    result.push({
      name: 'Song ' + i,
      metadata: {
        title: 'Song title ' + i,
        artist: 'Song artist ' + i
      }
    });
  }

  return result;
}