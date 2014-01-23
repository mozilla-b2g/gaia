'use strict';

Components.utils.import('resource://fakeserver/modules/httpd.js');
Components.utils.import('resource://gre/modules/NetUtil.jsm');

Components.utils.import("resource://fakeserver/modules/mimeParser.jsm");
Components.utils.import("resource://fakeserver/subscript/mime.jsm");

/**
 * Encode a WBXML writer's bytes for sending over the network.
 *
 * @param wbxml the WBXML Writer
 * @return a string of the bytes
 */
function encodeWBXML(wbxml) {
  return String.fromCharCode.apply(String, wbxml.bytes);
}

/**
 * Convert an nsIInputStream into a string.
 *
 * @param stream the nsIInputStream
 * @return the string
 */
function stringifyStream(stream) {
  if (!stream.available())
    return '';
  return NetUtil.readInputStreamToString(stream, stream.available());
}

/**
 * Decode a stream from the network into a WBXML reader.
 *
 * @param stream the incoming stream
 * @return the WBXML Reader
 */
function decodeWBXML(stream) {
  let str = stringifyStream(stream);
  if (!str)
    return null;

  let bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++)
    bytes[i] = str.charCodeAt(i);

  return new WBXML.Reader(bytes, ActiveSyncCodepages);
}

/**
 * Create a new ActiveSync folder.
 *
 * @param server the ActiveSyncServer object to associate this folder with
 * @param name the folder's name
 * @param type (optional) the folder's type, as an enum from
 *        FolderHierarchy.Enums.Type
 * @param parent (optional) the folder to contain this folder
 */
function ActiveSyncFolder(server, name, type, parentId) {
  this.server = server;
  this.name = name;
  this.type = type || ActiveSyncCodepages.FolderHierarchy.Enums.Type.Mail;
  this.id = 'folder-' + (this.server._nextCollectionId++);
  this.parentId = parentId || '0';

  this.messages = [];
  this._nextMessageSyncId = 1;
  this._messageSyncStates = {};
}

ActiveSyncFolder.prototype = {
  filterTypeToMS: {
    1: 86400 * 1000,
    2: 3 * 86400 * 1000,
    3: 7 * 86400 * 1000,
    4: 14 * 86400 * 1000,
    5: 30 * 86400 * 1000,
  },

  /**
   * Check if a message is in a given filter range.
   *
   * @param filterType the filter type to check
   * @param message a message object, created by messageGenerator.js
   * @return true if the message is in the filter range, false otherwise
   */
  _messageInFilterRange: function(filterType, message) {
    var clockNow = this.server._useNowTimestamp || Date.now();
    return filterType === ActiveSyncCodepages.AirSync.Enums.FilterType.NoFilter ||
           (clockNow - this.filterTypeToMS[filterType] <=
            message.date);
  },

  /**
   * Add a single message to this folder.
   *
   * @param newMessage an object with the following members:
   *        id: (string) a unique message id
   *        from: (string) the sender of the message
   *        to: (string, optional) the recipient(s) of the message
   *        cc: (string, optional) the cc(s) of the message
   *        replyTo: (string, optional) the reply-to address
   *        date: (number) the message's date, in ms since the UNIX epoch
   *        flags: (array) an array of flags representing the message's state;
   *          valid flags are "flagged" and "read"
   *        body: (object) the message's body, with the following members:
   *          type: (string) the body's MIME type
   *          content: (string) the body's data
   *        attachments: (array, optional) an array of attachments, represented
   *          as objects with the following members:
   *          filename: (string) the attachment's filename
   *          contentId: (string, optional) the content ID for the attachment
   *          content: (string) the attachment's data
   */
  addMessage: function(newMessage) {
    this.messages.unshift(newMessage);
    this.messages.sort(function(a, b) {
      return b.date - a.date;
    });

    for (let [,syncState] in Iterator(this._messageSyncStates)) {
      if (this._messageInFilterRange(syncState.filterType, newMessage))
        syncState.commands.push({ type: 'add', message: newMessage });
    }
  },

  /**
   * Add an array of messages to this folder.
   *
   * @param newMessages an array of message objects; see addMessage() for
   * details
   */
  addMessages: function(newMessages) {
    this.messages.unshift.apply(this.messages, newMessages);
    this.messages.sort(function(a, b) {
      return b.date - a.date;
    });

    for (let [,syncState] in Iterator(this._messageSyncStates)) {
      for (let message of newMessages)
        syncState.commands.push({ type: 'add', message: message });
    }
  },

  /**
   * Find a message object by its server ID.
   *
   * @param id the ServerId for the message
   * @return the message object, or null if no message was found
   */
  findMessageById: function(id) {
    for (let message of this.messages) {
      if (message.id === id)
        return message;
    }
    return null;
  },

  /**
   * Modify a message in this folder.
   *
   * @param message the message to modify
   * @param changes an object of changes to make; currently supports |read| (a
   *        boolean), and |flag| (a boolean)
   */
  changeMessage: function(message, changes) {
    function updateFlag(flag, state) {
      let idx = message.flags.indexOf(flag);
      if (state && idx !== -1)
        message.flags.push(flag);
      if (!state && idx === -1)
        message.flags.splice(idx, 1);
    }

    if ('read' in changes)
      updateFlag('read', changes.read);
    if ('flag' in changes)
      updateFlag('flagged', changes.flag);

    for (let [,syncState] in Iterator(this._messageSyncStates)) {
      // TODO: Handle the case where we already have this message in the command
      // list.
      if (this._messageInFilterRange(syncState.filterType, message))
        syncState.commands.push({ type: 'change', srvid: message.id,
                                  changes: changes });
    }
  },

  /**
   * Remove a message in this folder by its id.
   *
   * @param id the message's id
   * @return the deleted message, or null if the message wasn't found
   */
  removeMessageById: function(id) {
    for (let [i, message] in Iterator(this.messages)) {
      if (message.id === id) {
        this.messages.splice(i, 1);

        for (let [,syncState] in Iterator(this._messageSyncStates)) {
          if (this._messageInFilterRange(syncState.filterType, message))
            syncState.commands.push({ type: 'delete', srvid: message.id });
        }

        return message;
      }
    }

    return null;
  },

  /**
   * Create a JSON representation of this folder, for debugging purposes (and
   * sending back over the backdoor).
   *
   * @return the JSON representation of this folder
   */
  toJSON: function() {
    return {
      name: this.name,
      type: this.type,
      id: this.id,
      parentId: this.parentId,
    };
  },

  /**
   * Create a unique SyncKey.
   */
  _createSyncKey: function() {
    return 'messages-' + (this._nextMessageSyncId++) + '/' + this.id;
  },

  /**
   * Create a new sync state for this folder. Sync states keep track of the
   * changes in the folder that occur since the creation of the sync state.
   * These changes are filtered by the |filterType|, which limits the date
   * range of changes to listen for.
   *
   * A sync state can also be populated with an initial array of commands, or
   * "initial" to add all the messages in the folder to the state (subject to
   * |filterType|).
   *
   * Commands are ordered in the sync state from oldest to newest, to mimic
   * Hotmail's behavior. However, this implementation doesn't currently coalesce
   * multiple changes into a single command.
   *
   * @param filterType the filter type for this sync state
   * @param commands (optional) an array of commands to add to the sync state
   *        immediately, or the string "initial" to add all the current messages
   *        in the folder
   * @return the SyncKey associated with this sync state
   */
  createSyncState: function(filterType, commands) {
    if (commands === 'initial') {
      commands = [];
      // Go in reverse, since messages are stored in descending date order, but
      // we want ascending date order.
      for (let i = this.messages.length - 1; i >= 0; i--) {
        if (this._messageInFilterRange(filterType, this.messages[i]))
          commands.push({ type: 'add', message: this.messages[i] });
      }
    }

    let syncKey = this._createSyncKey();
    let syncState = this._messageSyncStates[syncKey] = {
      filterType: filterType,
      commands: commands || []
    };

    return syncKey;
  },

  /**
   * Recreate a sync state by giving it a new SyncKey and adding it back to our
   * list of tracked states.
   *
   * @param syncState the old sync state to add back in
   * @return the SyncKey associated with this sync state
   */
  recreateSyncState: function(syncState) {
    let syncKey = this._createSyncKey();
    this._messageSyncStates[syncKey] = syncState;
    return syncKey;
  },

  /**
   * Remove a sync state from our list (thus causing it to stop listening for
   * new changes) and return it.
   *
   * @param syncKey the SyncKey associated with the sync state
   * @return the sync state
   */
  takeSyncState: function(syncKey) {
    let syncState = this._messageSyncStates[syncKey];
    delete this._messageSyncStates[syncKey];
    return syncState;
  },

  /**
   * Check if the folder knows about a particular sync state.
   *
   * @param syncKey the SyncKey associated with the sync state
   * @return true if the folder knows about this sycn state, false otherwise
   */
  hasSyncState: function(syncKey) {
    return this._messageSyncStates.hasOwnProperty(syncKey);
  },

  /**
   * Get the filter type for a given sync state.
   *
   * @param syncKey the SyncKey associated with the sync state
   * @return the filter type
   */
  filterTypeForSyncState: function(syncKey) {
    return this._messageSyncStates[syncKey].filterType;
  },

  /**
   * Get the number of pending commands for a given sync state.
   *
   * @param syncKey the SyncKey associated with the sync state
   * @return the number of commands
   */
  numCommandsForSyncState: function(syncKey) {
    return this._messageSyncStates[syncKey].commands.length;
  },
};

/**
 * Create a new ActiveSync server instance. Currently, this server only supports
 * one user.
 */
function ActiveSyncServer(options) {
  this.server = new HttpServer(options);
  this.creds = options.creds;
  this._useNowTimestamp = null;

  const folderType = ActiveSyncCodepages.FolderHierarchy.Enums.Type;
  this._folders = [];
  this.foldersByType = {
    inbox:  [],
    sent:   [],
    drafts: [],
    trash:  [],
    normal: []
  };
  this.foldersById = {};

  this._nextCollectionId = 1;
  this._nextFolderSyncId = 1;
  this._folderSyncStates = {};

  this.addFolder('Inbox', folderType.DefaultInbox);
  this.addFolder('Sent Mail', folderType.DefaultSent);
  this.addFolder('Trash', folderType.DefaultDeleted);

  this.logRequest = null;
  this.logResponse = null;
  this.logResponseError = null;
}

ActiveSyncServer.prototype = {
  _makeNowDate: function() {
    if (this._useNowTimestamp) {
      var ts = this._useNowTimestamp;
      this._useNowTimestamp += 1000;
      return new Date(ts);
    }
    return new Date();
  },

  /**
   * Start the server on a specified port.
   */
  start: function(port) {
    this.server.registerPathHandler('/Microsoft-Server-ActiveSync',
                                    this._commandHandler.bind(this));
    this.server.registerPathHandler('/backdoor',
                                    this._backdoorHandler.bind(this));
    this.server.start(port);
  },

  /**
   * Stop the server.
   *
   * @param callback A callback to call when the server is stopped.
   */
  stop: function(callback) {
    // httpd.js explodes if you don't provide a callback.
    if (!callback)
      callback = function() {};
    this.server.stop({ onStopped: callback });
  },

  // Map folder type numbers from ActiveSync to Gaia's types
  _folderTypes: {
     1: 'normal', // Generic
     2: 'inbox',  // DefaultInbox
     3: 'drafts', // DefaultDrafts
     4: 'trash',  // DefaultDeleted
     5: 'sent',   // DefaultSent
     6: 'normal', // DefaultOutbox
    12: 'normal', // Mail
  },

  /**
   * Create a new folder on this server.
   *
   * @param name the folder's name
   * @param type (optional) the folder's type, as an enum from
   *        FolderHierarchy.Enums.Type
   * @param parentId (optional) the id of the folder to contain this folder
   * @param args (optional)
   */
  addFolder: function(name, type, parentId, args) {
    if (type && !this._folderTypes.hasOwnProperty(type))
      throw new Error('Invalid folder type');

    let folder = new ActiveSyncFolder(this, name, type, parentId, args);
    this._folders.push(folder);
    this.foldersByType[this._folderTypes[folder.type]].push(folder);
    this.foldersById[folder.id] = folder;

    for (let [,syncState] in Iterator(this._folderSyncStates))
      syncState.push({ type: 'add', folder: folder });

    return folder;
  },

  removeFolder: function(folderId) {
    for (let i = 0; i < this._folders.length; i++) {
      if (this._folders[i].id === folderId) {
        let folder = this._folders.splice(i, 1);

        for (let [,syncState] in Iterator(this._folderSyncStates))
          syncState.push({ type: 'delete', folderId: folderId });

        return folder;
      }
    }
  },

  /**
   * Handle incoming requests.
   *
   * @param request the nsIHttpRequest
   * @param response the nsIHttpResponse
   */
  _commandHandler: function(request, response) {
    try {
      var auth = atob(request.getHeader("Authorization")
                      .replace("Basic ", "")).split(':');
      if (auth[0].split('@')[0] !== this.creds.username ||
          auth[1] !== this.creds.password) {
        response.setStatusLine('1.1', '401', 'Wrong credentials');
        if (this.logResponse)
          this.logResponse(request, response, null);
        return;
      }

      if (request.method === 'OPTIONS') {
        if (this.logRequest)
          this.logRequest(request, null);
        this._options(request, response);
      }
      else if (request.method === 'POST') {
        let query = {};
        for (let param of request.queryString.split('&')) {
          let idx = param.indexOf('=');
          if (idx === -1) {
            query[decodeURIComponent(param)] = null;
          }
          else {
            query[decodeURIComponent(param.substring(0, idx))] =
              decodeURIComponent(param.substring(idx + 1));
          }
        }

        // XXX: Only try to decode WBXML when the client actually sent WBXML
        let wbxmlRequest = decodeWBXML(request.bodyInputStream);
        if (this.logRequest)
          this.logRequest(request, wbxmlRequest);
        let wbxmlResponse = this['_handleCommand_' + query.Cmd](
          wbxmlRequest, query, request, response);

        if (wbxmlResponse) {
          response.setStatusLine('1.1', 200, 'OK');
          response.setHeader('Content-Type', 'application/vnd.ms-sync.wbxml');
          response.write(encodeWBXML(wbxmlResponse));
          if (this.logResponse)
            this.logResponse(request, response, wbxmlResponse);
        }
      }
    } catch(e) {
      if (this.logResponseError)
        this.logResponseError(e + '\n' + e.stack);
      else
        dump(e + '\n' + e.stack + '\n');
      throw e;
    }
  },

  /**
   * Handle the OPTIONS request, returning our list of supported commands, and
   * other useful details.
   *
   * @param request the nsIHttpRequest
   * @param response the nsIHttpResponse
   */
  _options: function(request, response) {
    response.setStatusLine('1.1', 200, 'OK');
    response.setHeader('Public', 'OPTIONS,POST');
    response.setHeader('Allow', 'OPTIONS,POST');
    response.setHeader('MS-ASProtocolVersions', '14.0');

    // Find the commands we've implemented.
    let commands = [], m;
    for (let key in this) {
      if (( m = /^_handleCommand_(.*)$/.exec(key) ))
        commands.push(m[1]);
    }
    response.setHeader('MS-ASProtocolCommands', commands.join(','));

    if (this.logResponse)
      this.logResponse(request, response);
  },

  /**
   * Handle the FolderSync command. This entails keeping track of which folders
   * the client knows about using folder SyncKeys.
   *
   * @param requestData the WBXML.Reader for the request
   */
  _handleCommand_FolderSync: function(requestData) {
    const fh = ActiveSyncCodepages.FolderHierarchy.Tags;
    const folderType = ActiveSyncCodepages.FolderHierarchy.Enums.Type;

    let syncKey;

    let e = new WBXML.EventParser();
    e.addEventListener([fh.FolderSync, fh.SyncKey], function(node) {
      syncKey = node.children[0].textContent;
    });
    e.run(requestData);

    let nextSyncKey = 'folders-' + (this._nextFolderSyncId++);
    this._folderSyncStates[nextSyncKey] = [];

    let w = new WBXML.Writer('1.3', 1, 'UTF-8');
    w.stag(fh.FolderSync)
       .tag(fh.Status, '1')
       .tag(fh.SyncKey, nextSyncKey)
      .stag(fh.Changes);

    if (syncKey === '0') {
      w.tag(fh.Count, this._folders.length);

      for (let folder of this._folders) {
        w.stag(fh.Add)
           .tag(fh.ServerId, folder.id)
           .tag(fh.ParentId, folder.parentId)
           .tag(fh.DisplayName, folder.name)
           .tag(fh.Type, folder.type)
         .etag();
      }
    }
    else {
      let syncState = this._folderSyncStates[syncKey];
      delete this._folderSyncStates[syncKey];
      w.tag(fh.Count, syncState.length);

      for (let change of syncState) {
        if (change.type === 'add') {
          w.stag(fh.Add)
             .tag(fh.ServerId, change.folder.id)
             .tag(fh.ParentId, change.folder.parentId)
             .tag(fh.DisplayName, change.folder.name)
             .tag(fh.Type, change.folder.type)
           .etag();
        }
        else if (change.type === 'delete') {
          w.stag(fh.Delete)
             .tag(fh.ServerId, change.folderId)
           .etag();
        }
      }
    }

    w  .etag(fh.Changes)
     .etag(fh.FolderSync);

    return w;
  },

  /**
   * Handle the Sync command. This is the meat of the ActiveSync server. We need
   * to keep track of SyncKeys for each folder (handled in ActiveSyncFolder),
   * respond to commands from the client, and update clients with any changes
   * we know about.
   *
   * @param requestData the WBXML.Reader for the request
   * @param query an object of URL query parameters
   * @param request the nsIHttpRequest
   * @param response the nsIHttpResponse
   */
  _handleCommand_Sync: function(requestData, query, request, response) {
    if (!requestData)
      requestData = this._cachedSyncRequest;

    const as = ActiveSyncCodepages.AirSync.Tags;
    const asb = ActiveSyncCodepages.AirSyncBase.Tags;
    const asEnum = ActiveSyncCodepages.AirSync.Enums;

    let syncKey, collectionId, getChanges,
        server = this,
        deletesAsMoves = true,
        filterType = asEnum.FilterType.NoFilter,
        truncationSize = 0,
        clientCommands = [];

    let e = new WBXML.EventParser();
    const base = [as.Sync, as.Collections, as.Collection];

    e.addEventListener(base.concat(as.SyncKey), function(node) {
      syncKey = node.children[0].textContent;
    });
    e.addEventListener(base.concat(as.CollectionId), function(node) {
      collectionId = node.children[0].textContent;
    });
    e.addEventListener(base.concat(as.DeletesAsMoves), function(node) {
      deletesAsMoves = node.children.length === 0 ||
                       node.children[0].textContent === '1';
    });
    e.addEventListener(base.concat(as.GetChanges), function(node) {
      getChanges = node.children.length === 0 ||
                   node.children[0].textContent === '1';
    });
    e.addEventListener(base.concat(as.Options, as.FilterType), function(node) {
      filterType = node.children[0].textContent;
    });
    e.addEventListener(base.concat(as.Options, asb.BodyPreference),
                       function(node) {
      truncationSize = node.children[0].textContent;
    });
    e.addEventListener(base.concat(as.Commands, as.Change), function(node) {
      let command = { type: 'change' };
      for (let child of node.children) {
        switch(child.tag) {
        case as.ServerId:
          command.srvid = child.children[0].textContent;
          break;
        case as.ApplicationData:
          command.changes = server._parseEmailChange(child);
          break;
        }
      }
      clientCommands.push(command);
    });
    e.addEventListener(base.concat(as.Commands, as.Delete), function(node) {
      let command = { type: 'delete' };
      for (let child of node.children) {
        switch(child.tag) {
        case as.ServerId:
          command.srvid = child.children[0].textContent;
          break;
        }
      }
      clientCommands.push(command);
    });
    e.run(requestData);

    // If GetChanges wasn't specified, it defaults to true when the SyncKey is
    // non-zero, and false when the SyncKey is zero.
    if (getChanges === undefined)
      getChanges = syncKey !== '0';

    // Now it's time to actually perform the sync operation!

    let folder = this._findFolderById(collectionId),
        syncState = null, status, nextSyncKey;

    // - Get an initial sync key.
    if (syncKey === '0') {
      // Initial sync can't change anything, in either direction.
      if (getChanges || clientCommands.length) {
        let w = new WBXML.Writer('1.3', 1, 'UTF-8');
        w.stag(as.Sync)
           .tag(as.Status, asEnum.Status.ProtocolError)
         .etag();
       return w;
      }

      nextSyncKey = folder.createSyncState(filterType, 'initial');
      status = asEnum.Status.Success;
    }
    // - Check for invalid sync keys.
    else if (!folder.hasSyncState(syncKey) ||
             (filterType &&
              filterType !== folder.filterTypeForSyncState(syncKey))) {
      nextSyncKey = '0';
      status = asEnum.Status.InvalidSyncKey;
    }
    // - Perform a sync operation where the client has requested some changes.
    else if (clientCommands.length) {
      // Save off the sync state so that our commands don't touch it.
      syncState = folder.takeSyncState(syncKey);

      // Run any commands the client sent.
      for (let command of clientCommands) {
        if (command.type === 'change') {
          let message = folder.findMessageById(command.srvid);
          folder.changeMessage(message, command.changes);
        }
        else if (command.type === 'delete') {
          let message = folder.removeMessageById(command.srvid);
          if (deletesAsMoves)
            this.foldersByType['trash'][0].addMessage(message);
        }
      }

      // Create the next sync state, with a new SyncKey.
      if (getChanges) {
        // Create a fresh sync state.
        nextSyncKey = folder.createSyncState(syncState.filterType);
      }
      else {
        // Create a new state with the old one's command list, and clear out
        // our syncState so we don't return any changes.
        nextSyncKey = folder.recreateSyncState(syncState);
        syncState = null;
      }

      status = asEnum.Status.Success;
    }
    else if (getChanges) {
      if (folder.numCommandsForSyncState(syncKey)) {
        // There are pending changes, so create a fresh sync state.
        syncState = folder.takeSyncState(syncKey);
        nextSyncKey = folder.createSyncState(syncState.filterType);
        status = asEnum.Status.Success;
      }
      else {
        // There are no changes, so cache the sync request and return an empty
        // response.
        response.setStatusLine('1.1', 200, 'OK');
        requestData.rewind();
        this._cachedSyncRequest = requestData;
        return;
      }
    }
    // - A sync without changes requested and no commands to run -> error!
    else {
      let w = new WBXML.Writer('1.3', 1, 'UTF-8');
      w.stag(as.Sync)
         .tag(as.Status, asEnum.Status.ProtocolError)
       .etag();
      return w;
    }

    let w = new WBXML.Writer('1.3', 1, 'UTF-8');

    w.stag(as.Sync)
       .stag(as.Collections)
         .stag(as.Collection)
           .tag(as.SyncKey, nextSyncKey)
           .tag(as.CollectionId, collectionId)
           .tag(as.Status, status);

    if (syncState && syncState.commands.length) {
      w.stag(as.Commands);

      for (let command of syncState.commands) {
        if (command.type === 'add') {
          w.stag(as.Add)
             .tag(as.ServerId, command.message.id)
             .stag(as.ApplicationData);

          this._writeEmail(w, folder, command.message, truncationSize);

          w  .etag(as.ApplicationData)
            .etag(as.Add);
        }
        else if (command.type === 'change') {
          w.stag(as.Change)
             .tag(as.ServerId, command.srvid)
             .stag(as.ApplicationData);

          if ('read' in command.changes)
            w.tag(em.Read, command.changes.read ? '1' : '0');

          if ('flag' in command.changes)
            w.stag(em.Flag)
               .tag(em.Status, command.changes.flag)
             .etag();

          w  .etag(as.ApplicationData)
            .etag(as.Change);
        }
        else if (command.type === 'delete') {
          w.stag(as.Delete)
             .tag(as.ServerId, command.srvid)
           .etag(as.Delete);
        }
      }

      w.etag(as.Commands);
    }

    if (clientCommands.length) {
      w.stag(as.Responses);

      for (let command of clientCommands) {
        if (command.type === 'change') {
          w.stag(as.Change)
             .tag(as.ServerId, command.srvid)
             .tag(as.Status, asEnum.Status.Success)
           .etag(as.Change);
        }
      }

      w.etag(as.Responses);
    }

    w    .etag(as.Collection)
       .etag(as.Collections)
     .etag(as.Sync);

    return w;
  },

  /**
   * Handle the ItemOperations command. Mainly, this is used to get message
   * bodies and attachments.
   *
   * @param requestData the WBXML.Reader for the request
   */
  _handleCommand_ItemOperations: function(requestData) {
    const io = ActiveSyncCodepages.ItemOperations.Tags;
    const as = ActiveSyncCodepages.AirSync.Tags;
    const asb = ActiveSyncCodepages.AirSyncBase.Tags;

    let fetches = [];

    let e = new WBXML.EventParser();
    e.addEventListener([io.ItemOperations, io.Fetch], function(node) {
      let fetch = {};

      for (let child of node.children) {
        switch (child.tag) {
        case as.CollectionId:
          fetch.collectionId = child.children[0].textContent;
          break;
        case as.ServerId:
          fetch.srvid = child.children[0].textContent;
          break;
        case asb.FileReference:
          fetch.fileReference = child.children[0].textContent;
          break;
        }
      }

      fetches.push(fetch);
    });
    e.run(requestData);

    let w = new WBXML.Writer('1.3', 1, 'UTF-8');
    w.stag(io.ItemOperations)
       .tag(io.Status, '1')
       .stag(io.Response);

    for (let fetch of fetches) {
      w.stag(io.Fetch)
         .tag(io.Status, '1')

      // XXX: Add error handling
      if ('fileReference' in fetch) {
        let [folderId, messageId, attIdx] = fetch.fileReference.split('/'),
            folder = this._findFolderById(folderId),
            message = folder.findMessageById(messageId),
            attachment = message.attachments[parseInt(attIdx)];

        w.tag(asb.FileReference, fetch.fileReference)
         .stag(io.Properties)
           .tag(asb.ContentType, attachment.contentType)
           .tag(io.Data, btoa(attachment.content)) // inline att's are base64'd
         .etag(io.Properties);
      }
      else {
        let folder = this._findFolderById(fetch.collectionId),
            message = folder.findMessageById(fetch.srvid);

        w.tag(as.CollectionId, fetch.collectionId)
         .tag(as.ServerId, fetch.srvid)
         .tag(as.Class, 'Email')
         .stag(io.Properties);

        this._writeEmail(w, folder, message);

        w.etag(io.Properties);
      }

      w.etag(io.Fetch);
    }

    w  .etag(io.Response)
     .etag(io.ItemOperations);

    return w;
  },

  /**
   * Handle the GetItemEstimate command. This gives the client the number of
   * changes to expect from a Sync request.
   *
   * @param requestData the WBXML.Reader for the request
   */
  _handleCommand_GetItemEstimate: function(requestData) {
    const ie = ActiveSyncCodepages.ItemEstimate.Tags;
    const as = ActiveSyncCodepages.AirSync.Tags;
    const ieStatus = ActiveSyncCodepages.ItemEstimate.Enums.Status;

    let syncKey, collectionId;

    let server = this;
    let e = new WBXML.EventParser();
    e.addEventListener([ie.GetItemEstimate, ie.Collections, ie.Collection],
                       function(node) {
      for (let child of node.children) {
        switch (child.tag) {
        case as.SyncKey:
          syncKey = child.children[0].textContent;
          break;
        case ie.CollectionId:
          collectionId = child.children[0].textContent;
          break;
        }
      }
    });
    e.run(requestData);

    let status, syncState, estimate,
        folder = this._findFolderById(collectionId);
    if (!folder)
      status = ieStatus.InvalidCollection;
    else if (syncKey === '0')
      status = ieStatus.NoSyncState;
    else if (!folder.hasSyncState(syncKey))
      status = ieStatus.InvalidSyncKey;
    else {
      status = ieStatus.Success;
      estimate = folder.numCommandsForSyncState(syncKey);
    }

    let w = new WBXML.Writer('1.3', 1, 'UTF-8');
    w.stag(ie.GetItemEstimate)
       .stag(ie.Response)
         .tag(ie.Status, status);

    if (status === ieStatus.Success)
      w  .stag(ie.Collection)
           .tag(ie.CollectionId, collectionId)
           .tag(ie.Estimate, estimate)
         .etag();

    w  .etag(ie.Response)
     .etag(ie.GetItemEstimate);

    return w;
  },

  /**
   * Handle the MoveItems command. This lets clients move messages between
   * folders. Note that they'll have to get up-to-date via a Sync request
   * afterward.
   *
   * @param requestData the WBXML.Reader for the request
   */
  _handleCommand_MoveItems: function(requestData) {
    const mo = ActiveSyncCodepages.Move.Tags;
    const moStatus = ActiveSyncCodepages.Move.Enums.Status;

    let moves = [];
    let e = new WBXML.EventParser();
    e.addEventListener([mo.MoveItems, mo.Move], function(node) {
      let move = {};

      for (let child of node.children) {
        let textContent = child.children[0].textContent;

        switch (child.tag) {
        case mo.SrcMsgId:
          move.srcMessageId = textContent;
          break;
        case mo.SrcFldId:
          move.srcFolderId = textContent;
          break;
        case mo.DstFldId:
          move.destFolderId = textContent;
          break;
        }
      }

      moves.push(move);
    });
    e.run(requestData);

    let w = new WBXML.Writer('1.3', 1, 'UTF-8');
    w.stag(mo.MoveItems);

    for (let move of moves) {
      let srcFolder = this._findFolderById(move.srcFolderId),
          destFolder = this._findFolderById(move.destFolderId),
          status;

      if (!srcFolder) {
        status = moStatus.InvalidSourceId;
      }
      else if (!destFolder) {
        status = moStatus.InvalidDestId;
      }
      else if (srcFolder === destFolder) {
        status = moStatus.SourceIsDest;
      }
      else {
        let message = srcFolder.removeMessageById(move.srcMessageId);

        if (!message) {
          status = moStatus.InvalidSourceId;
        }
        else {
          status = moStatus.Success;
          destFolder.addMessage(message);
        }
      }

      w.stag(mo.Response)
         .tag(mo.SrcMsgId, move.srcMessageId)
         .tag(mo.Status, status);

      if (status === moStatus.Success)
        w.tag(mo.DstMsgId, move.srcMessageId)

      w.etag(mo.Response);
    }

    w.etag(mo.MoveItems);
    return w;
  },

  /**
   * Find a folder object by its server ID.
   *
   * @param id the CollectionId for the folder
   * @return the ActiveSyncFolder object, or null if no folder was found
   */
  _findFolderById: function(id) {
    for (let folder of this._folders) {
      if (folder.id === id)
        return folder;
    }
    return null;
  },

  /**
   * Find a folder object by its server ID.
   *
   * @param id the CollectionId for the folder
   * @return the ActiveSyncFolder object, or null if no folder was found
   */
  findFolderByName: function(name) {
    for (let folder of this._folders) {
      if (folder.name === name)
        return folder;
    }
    return null;
  },

  /**
   * Write the WBXML for an individual message.
   *
   * @param w the WBXML writer
   * @param folder the folder the message belongs to
   * @param message the message object
   * @param truncSize the truncation size for the body (optional, defaults to
   *        no truncation)
   */
  _writeEmail: function(w, folder, message, truncSize) {
    const em  = ActiveSyncCodepages.Email.Tags;
    const asb = ActiveSyncCodepages.AirSyncBase.Tags;
    const asbEnum = ActiveSyncCodepages.AirSyncBase.Enums;

    // TODO: make this match the requested type
    let bodyType = message.body.contentType === 'text/html' ?
                   asbEnum.Type.HTML : asbEnum.Type.PlainText;

    w.tag(em.From, message.from);

    if (message.to)
      w.tag(em.To, message.to);
    if (message.cc)
      w.tag(em.Cc, message.cc);
    if (message.replyTo)
      w.tag(em.Cc, message.replyTo);

    w.tag(em.Subject, message.subject)
     .tag(em.DateReceived, new Date(message.date).toISOString())
     .tag(em.Importance, '1')
     .tag(em.Read, message.flags.indexOf('read') !== -1 ? '1' : '0')
     .stag(em.Flag)
       .tag(em.Status, message.flags.indexOf('flagged') !== -1 ? '1' : '0')
     .etag();

    if (message.attachments && message.attachments.length) {
      w.stag(asb.Attachments);
      for (let [i, attachment] in Iterator(message.attachments)) {
        w.stag(asb.Attachment)
           .tag(asb.DisplayName, attachment.filename)
           .tag(asb.FileReference, folder.id + '/' + message.id + '/' + i)
           .tag(asb.Method, asbEnum.Method.Normal)
          .tag(asb.EstimatedDataSize, attachment.content.length);

        if (attachment.contentId) {
          w.tag(asb.ContentId, attachment.contentId)
           .tag(asb.IsInline, '1');
        }

        w.etag();
      }
      w.etag();
    }

    let bodyContent = message.body.content;
    if (truncSize !== undefined)
      bodyContent = bodyContent.substring(0, truncSize);

    w.stag(asb.Body)
       .tag(asb.Type, bodyType)
       .tag(asb.EstimatedDataSize, message.body.content.length)
       .tag(asb.Truncated, bodyContent.length === message.body.content.length ?
                           '0' : '1');

    if (bodyContent)
      w.tag(asb.Data, bodyContent);

    w.etag(asb.Body);
  },

  /**
   * Parse the WBXML for a client-side email change command.
   *
   * @param node the (fully-parsed) ApplicationData node and its children
   * @return an object enumerating the changes requested
   */
  _parseEmailChange: function(node) {
    const em = ActiveSyncCodepages.Email.Tags;
    let changes = {};

    for (let child of node.children) {
      switch (child.tag) {
      case em.Read:
        changes.read = child.children[0].textContent === '1';
        break;
      case em.Flag:
        for (let grandchild of child.children) {
          switch (grandchild.tag) {
          case em.Status:
            changes.flag = grandchild.children[0].textContent;
            break;
          }
        }
        break;
      }
    }

    return changes;
  },

  _handleCommand_SendMail: function(requestData, query, request, response) {
    const cm = ActiveSyncCodepages.ComposeMail.Tags;

    let e = new WBXML.EventParser();
    var saveInSentItems = false, mimeBody;
    e.addEventListener([cm.SendMail, cm.SaveInSentItems], function(node) {
      // The presence of this item indicates true; there is no way for it to
      // convey false.
      saveInSentItems = true;
    });
    e.addEventListener([cm.SendMail, cm.Mime], function(node) {
      mimeBody = node.children[0].data; // (opaque, not text)
    });
    e.run(requestData);

    // For maximum realism and (more importantly) avoiding weird causality
    // problems, use a now-ish date rather than the extracted compose date.
    var receiveTimestamp = this._makeNowDate().valueOf();

    if (saveInSentItems) {
      var sentMessage = convertRfc2822RepToMessageRep(mimeBody);
      // this wants a unique-ish id...
      sentMessage.id += '-sent';
      sentMessage.date = receiveTimestamp;
      var sentFolder = this.foldersByType.sent[0];
      sentFolder.addMessage(sentMessage);
    }
    var message = convertRfc2822RepToMessageRep(mimeBody);
    message.date = receiveTimestamp;
    var inboxFolder = this.foldersByType.inbox[0];
    inboxFolder.addMessage(message);

    return null;
  },

  _backdoorHandler: function(request, response) {
    try {
      let postData = JSON.parse(stringifyStream(request.bodyInputStream));
      if (this.logRequest)
        this.logRequest(request, postData);

      let responseData = this['_backdoor_' + postData.command ](postData);
      if (this.logResponse)
        this.logResponse(request, response, responseData);

      response.setStatusLine('1.1', 200, 'OK');
      if (responseData)
        response.write(JSON.stringify(responseData));
    } catch(e) {
      if (this.logResponseError)
        this.logResponseError(e + '\n' + e.stack);
      throw e;
    }
  },

  _backdoor_getFolderByPath: function(data) {
    return this.findFolderByName(data.name);
  },

  _backdoor_setDate: function(data) {
    this._useNowTimestamp = data.timestamp;
  },

  _backdoor_addFolder: function(data) {
    // XXX: Come up with a smarter way to preserve folder types when deleting
    // and recreating them!
    const folderType = ActiveSyncCodepages.FolderHierarchy.Enums.Type;
    let type = data.type;
    if (!type) {
      if (data.name === 'Inbox')
        type = folderType.DefaultInbox;
      else if (data.name === 'Sent Mail')
        type = folderType.DefaultSent;
      else if (data.name === 'Trash')
        type = folderType.DefaultDeleted;
    }

    return this.addFolder(data.name, type, data.parentId);
  },

  _backdoor_removeFolder: function(data) {
    this.removeFolder(data.folderId);
  },

  _backdoor_addMessagesToFolder: function(data) {
    let folder = this._findFolderById(data.folderId);
    folder.addMessages(data.messages);
    return folder.messages.length;
  },

  _backdoor_getMessagesInFolder: function(data) {
    let folder = this._findFolderById(data.folderId);
    return folder.messages.map(function(msg) {
      return {
        date: msg.date,
        subject: msg.subject
      };
    });
  },

  _backdoor_changeCredentials: function(data) {
    if (data.credentials.username)
      this.creds.username = data.credentials.username;
    if (data.credentials.password)
      this.creds.password = data.credentials.password;
  },

  _backdoor_removeMessagesByServerId: function(data) {
    let folder = this._findFolderById(data.folderId);
    data.serverIds.forEach(function(serverId) {
      folder.removeMessageById(serverId);
    });
  },
};
