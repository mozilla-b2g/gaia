define(function(require) {



/**
 *
 * @typedef {Object} FolderMeta
 *
 * @property {string} id - ID assigned to the folder by the backend.
 *
 * @property {string} serverId - Optional. For ActiveSync folders, the
 * server-issued id for the folder that we use to reference the folder.
 *
 * @property {string} name - The human-readable name of the folder with all utf-7
 * decoding/etc performed. This is intended to be shown to the user,
 * the path should not be. Folder names should be considered
 * private/personal data and if logged should be marked to be
 * sanitized unless the user has explicitly enabled super-verbose
 * privacy-entraining logs.
 *
 * @property {string} type - The type of the folder, i.e. 'inbox' or 'drafts'.
 * Refer to mailapi.js for a list of acceptable values.
 *
 * @property {string} path - The fully qualified path of the folder.
 * For IMAP servers, this is the raw path including utf-7 encoded parts.
 * For ActiveSync and POP3 this is just for super-verbose private-data-entraining
 * debugging and testing.
 * This should be considered private/personal data like the folder name.
 *
 * @property {number} depth - The depth of the folder in the folder tree.
 * This is useful since the folders are stored as a flattened list, so
 * attempts to display the folder hierarchy would otherwise have to compute
 * this themsevles.
 *
 * @property {DateMS} lastSyncedAt - The last time the folder was synced.
 *
 * @property {number} unreadCount - The total number of locally stored unread
 * messages in the folder.
 *
 * @property {string} syncKey - ActiveSync-only per-folder synchronization key.
 */


function makeFolderMeta(raw) {
  return {
    id: raw.id || null,
    serverId: raw.serverId || null,
    name: raw.name || null,
    type: raw.type || null,
    path: raw.path || null,
    parentId: raw.parentId || null,
    depth: raw.depth || 0,
    lastSyncedAt: raw.lastSyncedAt || 0,
    unreadCount: raw.unreadCount || 0,
    syncKey: raw.syncKey || null,
    version: raw.version || null
  }
};

return {
	makeFolderMeta: makeFolderMeta
}

}); // end define
