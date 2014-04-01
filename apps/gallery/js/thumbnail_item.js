/**
 * ThumbnailItem is view object for a single gallery item data. It renders file
 * in listitem object.
 *
 * CONSTRUCTOR:
 *   To create a ThumbnailItem objet requires the following argument:
 *      fileData: the file data object from mediadb.
 *
 * Properties:
 *   htmlNode: the HTML DOM node for this thumbnail item. It is rendered at the
 *             creation of object.
 *   data: the file data object bound with this thumbnail item.
 */
function ThumbnailItem(fileData) {
  if (!fileData) {
    throw new Error('fileData should not be null or undefined.');
  }
  this.data = fileData;

  this.htmlNode = document.createElement('div');
  this.htmlNode.classList.add('thumbnailContainer');
  this.imgNode = document.createElement('img');
  this.imgNode.alt = '';
  this.imgNode.classList.add('thumbnail');
  this.imgNode.dataset.filename = fileData.name;

  // We revoke this url in imageDeleted
  var url = URL.createObjectURL(fileData.metadata.thumbnail);
  this.imgNode.src = url;
  this.htmlNode.appendChild(this.imgNode);
}
