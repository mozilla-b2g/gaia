/* exported renderFile */
/* global MockLazyLoader, AudioMetadata, Sanitizer */
window.LazyLoader = MockLazyLoader;

function displayMetaData(metadata) {
  return Sanitizer.createSafeHTML `
    <tr><td><b>tag format:</b></td><td>${metadata.tag_format}</td></tr>
    <tr><td><b>album:</b></td><td>${metadata.album}</td></tr>
    <tr><td><b>artist:</b></td><td>${metadata.artist}</td></tr>
    <tr><td><b>title:</b></td><td>${metadata.title}</td></tr>`;
}

function renderFile(file){
  resetMetaData();
  var dropLabel = document.getElementById('dropLabel');
  dropLabel.textContent = 'Loading file...';
  AudioMetadata.parse(file).then((metaData) => {
    if (!metaData) {
      dropLabel.textContent = 'error reading metadata';
      dropLabel.style.color = 'red';
    } else {
      document.getElementById('metadataTags').innerHTML =
        Sanitizer.unwrapSafeHTML(displayMetaData(metaData));
      dropLabel.textContent = 'File loaded !';
    }
    resetThumbnail();

    if (metaData.picture) {
      console.log(metaData.picture);

      if (metaData.picture.flavor == 'embedded') {
        metaData.picture.blob =
          file.slice(metaData.picture.start, metaData.picture.end,
                     metaData.picture.type);
      }
      if (metaData.picture.blob) {
        renderThumbnail(metaData.picture.blob);
      }
    }
  });
}

function renderThumbnail(thumbnailBlob, rotation) {
  var thumbnail = document.getElementById('thumbnail');
  var thumbnailContainer = document.getElementById('thumbnailContainer');
  thumbnail.src = URL.createObjectURL(thumbnailBlob);
  thumbnailContainer.style.display = 'block';
  thumbnail.onload = function(event) {
    var imageElement = event.srcElement || event.target;
    var height = Math.max(imageElement.height, imageElement.width);
    thumbnailContainer.style.height = height + 'px';
    thumbnailContainer.style.width =  height + 'px';
  };
}

function resetThumbnail() {
  var thumbnailContainer = document.getElementById('thumbnailContainer');
  thumbnailContainer.style.display = 'none';
}

function resetMetaData() {
  var metadataTagsTable = document.getElementById('metadataTags');
  while (metadataTagsTable.firstChild) {
    metadataTagsTable.removeChild(metadataTagsTable.firstChild);
  }
  metadataTagsTable.textContent = '';
  var thumbnail = document.getElementById('thumbnail');
  thumbnail.removeAttribute('src');
  document.getElementById('dropLabel').style.display = 'inline-block';
}
