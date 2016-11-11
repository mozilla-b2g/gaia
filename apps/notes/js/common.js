var App = new function() {
    var _this = this,
        cards = null, user = null,
        $notebooksList = null, elButtonNewNote = null,
        createNoteOnTap = false;

    var DEBUG = false,
        LOGGER_NAMESPACE = "DOAT-NOTES",
        TIME_FOR_NEW_NOTE_DOUBLECLICK = 200,
        NUMBER_OF_SCROLL_RETRIES = 10,
        EMPTY_CONTENT_CLASS = "show-empty",
        CLASS_EDIT_TITLE = "edit-title",
        CLASS_SEARCH_RESULTS = "search-results",
        DEFAULT_USER = {
            "id": "1",
            "username": "default",
            "name": "default"
        },
        TEXTS = {
            "NEW_NOTEBOOK": "Create Notebook",
            "NOTEBOOK_ALL": "All Notes",
            "NOTEBOOK_TRASH": "Trash",
            "NOTEBOOK_ACTION_TITLE": "Edit Notebook",
            "NOTEBOOK_ACTION_RENAME": "Rename",
            "NOTEBOOK_ACTION_DELETE": "Delete",
            "PROMPT_RENAME_NOTEBOOK": "Rename Notebook:",
            "PROMPT_DELETE_NOTEBOOK": "Tap OK to delete this notebook.\n\nNOTE: All its notes will be moved to the Trash.",
            "NOTE_RESTORED": "Restored to {{notebook}}",
            "NEW_NOTE": "New Note",
            "EMPTY_NOTEBOOK": "no notes recorded<br />start writing now",
            "EMPTY_TRASH": "your trash is empty!",
            "FIRST_NOTEBOOK_NAME": "My Notebook",
            "EMPTY_NOTEBOOK_NAME": "Notes",
            "NOTE_CANCEL_CHANGES": "You have made changes to the note, do you wish to save it?",
            "CONFIRM_TRASH_NOTE": "Tap OK to move this note to the Trash",
            "CONFIRM_DELETE_NOTE": "Are you sure you want to permanently delete this note?",
            "ADD_IMAGE_TITLE": "Attach a photo to your note:"
        },
        ORDERS = [
            {
                "property": "date_updated",
                "label": "Date updated",
                "descending": true
            },
            {
                "property": "date_created",
                "label": "Date created",
                "descending": true
            },
            {
                "property": "title",
                "label": "Title",
                "descending": false
            },
            {
                "property": "notebook_id",
                "label": "Notebook",
                "descending": false
            }
        ],
        INFO_FIELDS = [
            {
                "key": "notebook_id",
                "label": "Notebook",
                "type": "options"
            },
            {
                "key": "date_created",
                "label": "Created on",
                "type": "date"
            },
            {
                "key": "date_updated",
                "label": "Modified on",
                "type": "date"
            }
        ],
        SEARCH_FIELDS = ["text", "title"];
    
    this.init = function() {
        DEBUG && Console.init(LOGGER_NAMESPACE);
        
        cards = new Cards({
            "onMove": onCardMove
        });
        
        // handler of the notebook card (list of notes)
        NotebookView.init({
            "container": $("main"),
            "onClickNote": _this.showNote,
            "onChange": NotebooksList.refresh
        });
        // handler of the note card (view and edit actual note)
        NoteView.init({
            "container": $("note"),
            "elCancel": $("button-note-cancel"),
            "elSave": $("button-note-save"),
            "onSave": onNoteSave,
            "onCancel": onNoteCancel,
            "onRestore": onNoteRestore,
            "onDelete": onNoteDelete,
            "onResourceClick": onResourceClick
        });
        // handler of the note-info card
        NoteInfoView.init({
            "container": $("note-info"),
            "fields": INFO_FIELDS,
            "onNotebookChange": onNoteChangeNotebook
        });
        // handles the sorting of notebooks
        Sorter.init({
            "orders": ORDERS,
            "container": $("notebook-footer"),
            "onChange": function(order, desc) {
                NotebookView.showNotes(order, desc);
            }
        });
        // general object to show notifications on screen
        Notification.init({
            "container": $("container")
        });
        
        // when viewing image in full screen
        ResourceView.init({
            "container": $("image-fullscreen"),
            "onDelete": onResourceDelete
        });
        // main notes-search class
        Searcher.init({
            "input": $("searchNotes"),
            "fields": SEARCH_FIELDS,
            "onSearch": SearchHandler.onSearch,
            "onInputFocus": SearchHandler.onFocus,
            "onInputBlur": SearchHandler.onBlur
        });
        
        // list of notebooks
        NotebooksList.init({
            "container": $("notebooks"),
            "onClick": onNotebookClick,
            "onRefresh": NoteInfoView.refreshNotebooks,
            "onRename": onNotebookRename,
            "onDelete": onNotebookDelete
        });
        
        
        elButtonNewNote = $("button-notebook-add");
        
        $("button-new-notebook").addEventListener("click", _this.promptNewNotebook);
        
        $("button-notebook-search").addEventListener("click", SearchHandler.open);
        
        elButtonNewNote.addEventListener("click", function() {
            _this.newNote();
        });
        
        
        DB.init(initUser);
    };
    
    function initUser(){
        DB.getUsers({"id": DEFAULT_USER.id}, function onSuccess(users) {
            if (users.length == 0) {
                user = new User(DEFAULT_USER);
                DB.addUser(user, function onSuccess() {
                    _this.getUserNotes();
                });
            } else {
                user = users[0];
                _this.getUserNotes();
            }
        });
    }
    
    this.getUserNotes = function() {
        user.getNotebooks(function(notebooks) {
            if (notebooks.length == 0) {
                _this.newNotebook(TEXTS.FIRST_NOTEBOOK_NAME, function(notebook, note){
                    NotebooksList.refresh(notebooks);
                });
            } else {
                _this.showNotes(notebooks[0]);
                NotebooksList.refresh(notebooks);
            }
        });
    };
    
    this.newNotebook = function(name, cb) {
        user.newNotebook({
            "name": name
        }, function(notebook) {
            NotebookView.show(notebook);
            
            _this.newNote(notebook, function(note){
                cb && cb(notebook, note);
            });
        });
    };

    this.newNote = function(notebook, cb) {
        !notebook & (notebook = NotebookView.getCurrent());
        
        if (!notebook) return;
        
        notebook.newNote({
            "notebookId": notebook.getId()
        }, function(note){
            _this.showNote(note, notebook);
            
            NoteView.focus();
            
            cb && cb(note);
        });
    };

    this.getNotes = function() {
        return notes;
    };
    
    this.showNote = function(note, notebook) {
        if (typeof note == "string") {
            DB.getNotes({"id": note}, function(notes) {
                _this.showNote(notes[0], notebook);
            });
            return;
        }
        NoteView.show(note, notebook);
        cards.goTo(cards.CARDS.NOTE);
    };
    
    this.showNotes = function(notebook) {
        NotebookView.show(notebook);
        cards.goTo(cards.CARDS.MAIN);
        
        if (NotebookView.getCurrent()) {
            elButtonNewNote.style.display = "";
        }
    };

    this.promptNewNotebook = function() {
        var notebookName = prompt(TEXTS.NEW_NOTEBOOK, "");
        if (notebookName) {
            _this.newNotebook(notebookName);
        }
    };
    
    this.sortNotes = function(sort, isDesc) {
        NotebookView.showNotes(sort, isDesc);
    };
    
    this.showAllNotes = function() {
        NotebookView.show(null, {"trashed": false});
        
        elButtonNewNote.style.display = "none";
        NotebookView.setTitle(TEXTS.NOTEBOOK_ALL);
        
        cards.goTo(cards.CARDS.MAIN);
    };
    
    this.showTrashedNotes = function() {
        NotebookView.show(null, {"trashed": true});
        
        elButtonNewNote.style.display = "none";
        NotebookView.setTitle(TEXTS.NOTEBOOK_TRASH);
        
        cards.goTo(cards.CARDS.MAIN);
    };
    
    function onCardMove() {
        Notification.hide();
    }
    
    function onNotebookClick(type, notebook) {
        switch(type) {
            case "notebook":
                _this.showNotes(notebook);
                break;
            case "all":
                _this.showAllNotes();
                break;
            case "trash":
                _this.showTrashedNotes();
                break;
        }
    }
    
    function onNotebookRename(notebook) {
        var newName = prompt(TEXTS.PROMPT_RENAME_NOTEBOOK, notebook.getName() || "");
        if (newName) {
            notebook.set({
                "name": newName
            }, function onSuccess() {
                NotebooksList.refresh();
                NotebookView.show(notebook);
            });
        }
    }
    
    function onNotebookDelete(notebook) {
        if (confirm(TEXTS.PROMPT_DELETE_NOTEBOOK)) {
            notebook.trash(function onSuccess() {
                NotebooksList.refresh();
            });
        }
    }
    
    function onNoteSave(noteAffected) {
        _this.showNotes();
        NotebooksList.refresh();
    }
    
    function onNoteCancel(noteAffected, isChanged) {
        if (isChanged && confirm(TEXTS.NOTE_CANCEL_CHANGES)) {
            NoteView.save();
            return;
        }
        
        if (noteAffected.getName() == "" && noteAffected.getContent() == "") {
            noteAffected.remove(function onSuccess(){
                _this.showNotes();
                NotebooksList.refresh(); 
            }, function onError() {
                
            });
        } else {
            cards.goTo(cards.CARDS.MAIN);
        }
    }
    
    function onNoteRestore(noteAffected) {
        _this.showTrashedNotes();
        NotebooksList.refresh();
        
        noteAffected.getNotebook(function onSuccess(notebook){
            var txt = TEXTS.NOTE_RESTORED.replace("{{notebook}}", notebook.getName());
            Notification.show(txt);
        }, function onError() {
            
        });
    }
    
    function onNoteDelete(noteAffected) {
        _this.showTrashedNotes();
        NotebooksList.refresh();
    }
    
    function onNoteChangeNotebook(newNotebookId) {
        var note = NoteInfoView.getCurrent();
        
        note.getNotebook(function(notebook) {
            notebook.set({
                "numberOfNotes": notebook.getNumberOfNotes()-1
            });
        });
        
        note.set({
            "notebook_id": newNotebookId
        }, function onSuccess() {
            note.getNotebook(function(notebook) {
                notebook.set({
                    "numberOfNotes": notebook.getNumberOfNotes()+1
                });
                
                NotebooksList.refresh();
                NoteInfoView.selectNotebook(newNotebookId);
                NotebookView.show(notebook);
            });
        }, function onError() {
            
        });
    }
    
    function onResourceClick(resource) {
        ResourceView.show(resource);
    }
    
    function onResourceDelete(resource) {
        resource.remove(function onSuccess() {
            NoteView.loadResources();
            ResourceView.hide();
        });
    }
    
    function getNoteNameFromContent(content) {
        return (content || "").split("\n")[0];
    }
    
    var NotebooksList = new function() {
        var _this = this,
            el = null, elList = null,
            onClick = null, onRefresh = null, onRename = null, onDelete = null;
            
        var TIMEOUT_BEFORE_EDITING_NOTEBOOK = 400;
            
        this.init = function(options) {
            !options && (options = {});
            
            el = options.container;
            elList = el.querySelector("ul");
            
            onClick = options.onClick;
            onRefresh = options.onRefresh;
            onRename = options.onRename;
            onDelete = options.onDelete;
        };
        
        this.refresh = function(notebooks) {
            if (!notebooks) {
                user.getNotebooks(_this.refresh);
                return;
            }
            
            var numberOfTrashedNotes = 0;
            
            elList.innerHTML = "";
            
            createNotebookEntry_All();
            for (var i=0; i<notebooks.length; i++) {
                numberOfTrashedNotes += notebooks[i].getNumberOfTrashedNotes();
                
                if (!notebooks[i].getTrashed()) {
                    createNotebookEntry(notebooks[i]);
                }
            }
            createNotebookEntry_Trash(numberOfTrashedNotes);
            
            onRefresh && onRefresh(notebooks);
        };
        
        function createNotebookEntry(notebook) {
            var el = document.createElement("li"),
                numberOfApps = notebook.getNumberOfNotes();
                
            el.innerHTML = notebook.getName() + (numberOfApps? " (" + numberOfApps + ")" : "");
            el.addEventListener("mousedown", function(){
                this.timeoutHold = window.setTimeout(function(){
                    el.edited = true;
                    onEditNotebook(notebook);
                }, TIMEOUT_BEFORE_EDITING_NOTEBOOK);
            });
            el.addEventListener("mouseup", function(){
                window.clearTimeout(this.timeoutHold);
                if (!this.edited) {
                    clickNotebook(notebook);
                }
                this.edited = false;
            });
            
            elList.appendChild(el);
        }
        
        function createNotebookEntry_All() {
            var el = document.createElement("li");
            el.innerHTML = TEXTS.NOTEBOOK_ALL;
            el.className = "all";
            el.addEventListener("click", clickAll);
            
            elList.appendChild(el);
        }
        
        function createNotebookEntry_Trash(numberOfTrashedNotes) {
            var el = document.createElement("li");
            
            el.innerHTML = TEXTS.NOTEBOOK_TRASH + (numberOfTrashedNotes? " (" + numberOfTrashedNotes + ")" : "");
            el.className = "trash";
            el.addEventListener("click", clickTrash);
            
            elList.appendChild(el);
        }
    
        function onEditNotebook(notebook) {
            dialog(TEXTS.NOTEBOOK_ACTION_TITLE, [TEXTS.NOTEBOOK_ACTION_RENAME, TEXTS.NOTEBOOK_ACTION_DELETE], function(optionClicked) {
                if (optionClicked == 0) {
                    onRename && onRename(notebook);
                } else if (optionClicked == 1) {
                    onDelete && onDelete(notebook);
                }
            });
        }
    
        function clickNotebook(notebook) {
            onClick && onClick("notebook", notebook);
        }
        function clickAll(e) {
            onClick && onClick("all");
        }
        function clickTrash(e) {
            onClick && onClick("trash");
        }
    };
    
    var NoteView = new function() {
        var _this = this,
            currentNote = null, currentNotebook = null,
            noteContentBeforeEdit = "", noteNameBeforeEdit = "",
            el = null, elContent = null, elResources = null, elTitle = null, elEditTitle = null, elActions = null,
            elRestore = null, elDelete = null,
            onSave = null, onCancel = null, onRestore = null, onDelete = null, onTitleChange = null;
            
        var CLASS_EDIT_TITLE = "edit-title",
            CLASS_WHEN_VISIBLE = "visible",
            CLASS_WHEN_TRASHED = "readonly",
            CLASS_WHEN_HAS_IMAGES = "has-images";
            
        this.init = function(options) {
            el = options.container;
            elSave = options.elSave;
            elCancel = options.elCancel;
            
            onSave = options.onSave;
            onCancel = options.onCancel;
            onRestore = options.onRestore;
            onDelete = options.onDelete;
            onTitleChange = options.onTitleChange;
            onResourceClick = options.onResourceClick;
            
            elContent = el.querySelector("textarea");
            elResources = el.querySelector("#note-resources");
            elTitle = el.querySelector("h1");
            elEditTitle = el.querySelector("input");
            elActions = el.querySelector("#note-edit-actions");
            elRestore = el.querySelector("#button-note-restore");
            elDelete = el.querySelector("#button-note-delete");
            
            elTitle.addEventListener("click", _this.editTitle);
            elEditTitle.addEventListener("blur", _this.saveEditTitle);
            elEditTitle.addEventListener("keyup", function(e){
                (e.keyCode == 13) && _this.saveEditTitle();
            });
            
            elContent.addEventListener("focus", onContentFocus);
            elContent.addEventListener("blur", onContentBlur);
            elContent.addEventListener("keyup", onContentKeyUp);
            
            elSave.addEventListener("click", _this.save);
            elCancel.addEventListener("click", _this.cancel);
            
            elRestore.addEventListener("click", _this.restore);
            elDelete.addEventListener("click", _this.del);
            
            NoteActions.init({
                "el": elActions,
                "onBeforeAction": onBeforeAction,
                "onAfterAction": onAfterAction
            });
        };
        
        this.show = function(note, notebook) {
            var noteContent = note.getContent(),
                noteName = note.getName();

            noteContentBeforeEdit = noteContent;
            noteNameBeforeEdit = noteName;
            
            elContent.value = noteContent;
            _this.setTitle(noteName);
            _this.loadResources(note);
            
            if (note.isTrashed()) {
                el.classList.add(CLASS_WHEN_TRASHED);
            } else {
                el.classList.remove(CLASS_WHEN_TRASHED);
            }
            
            onContentKeyUp();
            onContentBlur();
            
            currentNote = note;
            currentNotebook = notebook;
        };
        
        this.loadResources = function(note) {
            !note && (note = currentNote);
            
            elResources.innerHTML = '';
            
            note.getResources(function onSuccess(resources) {
                for (var i=0; i<resources.length; i++) {
                    _this.addResource(resources[i]);
                }
            }, function onError() {
                
            });
        };
        
        this.addResource = function(resource) {
            elResources.appendChild(getResourceElement(resource));
        };
        
        this.getCurrentNote = function() { return currentNote; };
        this.getCurrentNotebook = function() { return currentNotebook; };
        
        this.setTitle = function(title) {
            html(elTitle, title || getNoteNameFromContent(elContent.value) || TEXTS.NEW_NOTE);
            elEditTitle.value = title || "";
        };
        
        this.editTitle = function() {
            if (!currentNote || currentNote.isTrashed()) return;
            
            el.classList.add(CLASS_EDIT_TITLE);
            elEditTitle.focus();
        };
        
        this.saveEditTitle = function() {
            el.classList.remove(CLASS_EDIT_TITLE);
            elEditTitle.blur();
            
            _this.setTitle(elEditTitle.value);
            
            onTitleChange && onTitleChange();
        };
        
        this.save = function() {
            var content = elContent.value,
                name = elEditTitle.value;
            
            currentNote.set({
                "title": name,
                "text": content
            }, function onSuccess(){
                onSave && onSave(currentNote);
            }, function onError(){
                Console.error("Error saving note!");
            });
        };
        
        this.cancel = function() {
            onCancel && onCancel(currentNote, _this.changed());
        };
        
        this.restore = function() {
            currentNote.restore(function onSuccess(){
                onRestore && onRestore(currentNote);
            }, function onError() {
                
            });
        };
        
        this.del = function() {
            if (confirm(TEXTS.CONFIRM_DELETE_NOTE)) {
                currentNote.remove(function onSuccess(){
                    onDelete && onDelete(currentNote);
                }, function onError() {
                    
                });
            }
        };
        
        this.focus = function() {
            elContent.focus();
            _this.scrollToElement(NUMBER_OF_SCROLL_RETRIES);
        };
        
        this.scrollToElement = function(numberOfTries) {
            var top = elContent.getBoundingClientRect().top;
            
            window.scrollTo(0, top);
            if (numberOfTries > 0 && document.body.scrollTop < top) {
                window.setTimeout(function(){
                    _this.scrollToElement(numberOfTries-1);
                }, 80);
            }
        };
        
        this.changed = function() {
            return noteContentBeforeEdit !== elContent.value || noteNameBeforeEdit !== elEditTitle.value;
        };
        
        function onContentKeyUp(e) {
            if (elContent.value) {
                elSave.classList.add(CLASS_WHEN_VISIBLE);
                !elEditTitle.value && (html(elTitle, getNoteNameFromContent(elContent.value)));
            } else {
                elSave.classList.remove(CLASS_WHEN_VISIBLE);
                _this.setTitle();
            }
        }

        function onContentFocus(e) {
            el.classList.remove(EMPTY_CONTENT_CLASS);
            
            window.scrollTo(0, 1);
            
            setHeightAccordingToScreen();
        }
        
        function onContentBlur(e) {
            if (elContent.value) {
                el.classList.remove(EMPTY_CONTENT_CLASS);
            } else {
                el.classList.add(EMPTY_CONTENT_CLASS);
            }
            
            resetHeight();
        }
        
        function setHeightAccordingToScreen() {
            var tries = 30,
                initialHeight = window.innerHeight,
                intervalHeight = window.setInterval(function(){
                
                if (window.innerHeight < initialHeight) {
                    elContent.style.height = elContent.style.minHeight = (window.innerHeight-elTitle.offsetHeight-elActions.offsetHeight) + "px";
                    window.scrollTo(0, 1);
                }
                
                if (tries == 0 || window.innerHeight < initialHeight) {
                    window.clearInterval(intervalHeight);
                }
                tries--;
            }, 100);
        }
        
        function resetHeight() {
            elContent.style.height = elContent.style.minHeight = "";
        }
        
        function getResourceElement(resource) {
            var el = document.createElement("li"),
                size = resource.getSize();
                
            el.className = resource.getType();
            el.innerHTML = '<span style="background-image: url(' + resource.getSrc() + ')"></span> ' +
                            (resource.getName() || "").replace(/</g, '&lt;') + (size? ' (' + readableFilesize(size) + ')' : '');
                            
                            
            el.addEventListener("click", function(){
                onResourceClick(resource);
            });
            
            return el;
        }
        
        function onResourceClick(resource) {
            onResourceClick && onResourceClick(resource);
        }
        
        function onBeforeAction(action) {
            switch(action) {
                case "type":
                    elContent.focus();
                    break;
                case "info":
                    NoteInfoView.load(currentNote);
                    cards.goTo(cards.CARDS.NOTE_INFO);
                    break;
                case "share":
                    break;
            }
        }
        
        function onAfterAction(action, output) {
            switch(action) {
                case "type":
                    break;
                case "photo":
                    output.type = ResourceTypes.IMAGE;
                    currentNote.newResource(output, function onSuccess(resource) {
                        _this.addResource(resource);
                        el.classList.add(CLASS_WHEN_HAS_IMAGES);
                    }, function onError() {
                        
                    });
                    break;
                case "info":
                    break;
                case "share":
                    break;
                case "delete":
                    if (output) {
                        App.showNotes();
                        NotebooksList.refresh();
                    }
                    break;
            }
        }
    };
    
    var NoteInfoView = new function() {
        var _this = this,
            el = null, fields = [], currentNote = null,
            onNotebookChange = null;
            
        this.init = function(options) {
            el = options.container;
            fields = options.fields;
            onNotebookChange = options.onNotebookChange;
            
            elFields = el.querySelector(".fields");
            
            initView();
        };
        
        this.load = function(note) {
            if (currentNote && note.getId() == currentNote.getId()) {
                return;
            }
            
            for (var i=0; i<fields.length; i++) {
                var f = fields[i],
                    value = note['data_' + f.key],
                    elValue = elFields.querySelector("." + f.key);
                    
                switch(f.type) {
                    case "date":
                        value = printDate(value);
                        html(elValue, value);
                        break;
                    case "options":
                        elValue.value = value;
                        break;
                }
            }
            
            currentNote = note;
        };
        
        this.getCurrent = function() {
            return currentNote;
        };
        
        this.refreshNotebooks = function(notebooks) {
            var html = '';
            for (var i=0; i<notebooks.length; i++) {
                html += '<option value="' + notebooks[i].getId() + '">' + notebooks[i].getName() + '</option>';
            }
            elFields.querySelector(".notebook_id").innerHTML = html;
        };
        
        this.selectNotebook = function(notebookId) {
            elFields.querySelector(".notebook_id").value = notebookId;
        };
        
        this.onChange_notebook_id = function(e) {
            onNotebookChange && onNotebookChange(this.value);
        };
        
        function initView() {
            var html = '';
            
            for (var i=0; i<fields.length; i++) {
                var f = fields[i],
                    type = f.type;
                
                if (type == "options") {
                    html += '<li>' +
                                '<label>' + f.label + '</label>' +
                                '<select class="' + f.key + '"></select>' +
                            '</li>';
                } else {
                    html += '<li>' +
                                '<label>' + f.label + '</label>' +
                                '<b class="value ' + f.key + '"></b>' +
                            '</li>';
                }
            }
            
            elFields.innerHTML += html;
            
            // automatically bind onChange events to all fields of type "option"
            for (var i=0; i<fields.length; i++) {
                var f = fields[i];
                
                if (f.type == "options") {
                    elFields.querySelector("select." + f.key).addEventListener("change", _this["onChange_" + f.key]);
                }
            }
        }
        
        function printDate(date) {
            if (typeof date == "number") {
                date = new Date(date);
            }
            
            var s = "",
                h = date.getHours(),
                m = date.getMinutes();
                
            s += (h<10? '0' : '') + h + ":" + (m<10? '0' : '') + m;
            s += " ";
            s += date.getDate() + "/" + (date.getMonth()+1) + "/" + date.getFullYear();
            
            return s;
        }
    };
    
    var NotebookView = new function() {
        var _this = this,
            el = null, elTitle = null, elEditTitle = null, elEmptyNotes = null, $notesList = null,
            currentNotebook = null, currentFilters = null, currentSort = "", currentIsDesc = false,
            onClickNote = null, notebookScrollOffset = 0,
            onChange = null;
        
        this.init = function(options) {
            el = options.container;
            onClickNote = options.onClickNote;
            onChange = options.onChange;
            
            elTitle = el.querySelector("h1");
            elEditTitle = el.querySelector("input");
            elEmptyNotes = el.querySelector(".empty p");
            
            elTitle.addEventListener("click", _this.editTitle);
            elEditTitle.addEventListener("blur", _this.saveEditTitle);
            elEditTitle.addEventListener("keyup", function(e){
                (e.keyCode == 13) && _this.saveEditTitle();
            });
            
            $notesList = el.getElementsByClassName("notebook-notes")[0];
            
            $notesList.addEventListener("click", clickNote);
            
            notebookScrollOffset = $("search").offsetHeight;
        };
        
        this.show = function(notebook, filters, bDontScroll) {
            if (filters) {
                notebook = null;
                currentNotebook = null;
            } else if(!notebook) {
                if (currentFilters) {
                    filters = currentFilters;
                    notebook = null;
                } else {
                    filters = null;
                    notebook = currentNotebook;
                }
            }
            
            el.classList.remove("notebook-real");
            el.classList.remove("notebook-fake");
            el.classList.add(notebook? "notebook-real": "notebook-fake");
            
            notebook && _this.setTitle(notebook.getName());
            
            if (!currentNotebook || currentNotebook.getId() != notebook.getId()) {
                currentSort = "";
                currentIsDesc = false;
            }
            
            currentNotebook = notebook;
            currentFilters = filters;
            
            _this.showNotes(currentSort, currentIsDesc, filters);
            
            if (!bDontScroll) {
                _this.scrollTop();
            }
        };
        
        this.showNotes = function(sortby, isDesc, filters) {
            currentSort = sortby;
            currentIsDesc = isDesc;
            
            if (currentNotebook) {
                if (currentNotebook.getNumberOfNotes() == 0) {
                    _this.printNotes([]);
                } else {
                    currentNotebook.getNotes(false, function(notes){
                        _this.printNotes(notes);
                    }, function onError() {
                        
                    });
                }
            } else {
                user.getNotes(filters, function onSuccess(notes){
                    _this.printNotes(notes);
                }, function onError() {
                    
                });
            }
        };
        
        this.printNotes = function(notes) {
            $notesList.innerHTML = '';
            
            notes = sortNotes(notes, currentSort, currentIsDesc);
            
            if (notes && notes.length > 0) {
                for (var i=0; i<notes.length; i++) {
                    $notesList.appendChild(getNoteElement(notes[i]));
                }
                el.classList.remove(EMPTY_CONTENT_CLASS);
            } else {
                el.classList.add(EMPTY_CONTENT_CLASS);
                elEmptyNotes.innerHTML = currentNotebook? TEXTS.EMPTY_NOTEBOOK : TEXTS.EMPTY_TRASH;
            }
            
            return $notesList;
        };
        
        this.setTitle = function(title) {
            html(elTitle, title || TEXTS.EMPTY_NOTEBOOK_NAME);
            elEditTitle.value = title || "";
        };
        
        this.editTitle = function() {
            if (!currentNotebook) return;
            
            el.classList.add(CLASS_EDIT_TITLE);
            elEditTitle.focus();
        };
        
        this.saveEditTitle = function() {
            if (!currentNotebook) return;
            
            el.classList.remove(CLASS_EDIT_TITLE);
            elEditTitle.blur();
            
            var newName = elEditTitle.value;
            if (newName != currentNotebook.getName()) {
                currentNotebook.set({
                    "name": newName
                }, function cbSuccess() {
                    _this.setTitle(newName);
                    onChange && onChange();
                }, function cbError() {
                    
                });
            }
        };

        this.getCurrent = function() {
            return currentNotebook;
        };
        
        this.scrollTop = function(scrollTop) {
            $notesList.parentNode.scrollTop = (typeof scrollTop == "number")? scrollTop : notebookScrollOffset;
        };
        
        function getNoteElement(note) {
            var el = document.createElement("li");
            el.className = "note";
            el.dataset.noteId = note.getId();
            el.innerHTML = '<div><span class="text">' + (note.getName() || getNoteNameFromContent(note.getContent())).replace(/</g, '&lt;') + '</span> <span class="time">' + prettyDate(note.getDateUpdated()) + '</span></div>' +
                            '<div class="title">' + note.getContent().replace(/</g, '&lt;') + '</div>';/* +
                            (note.getImages().length > 0? '<div class="image" style="background-image: url(' + note.getImages()[0].src + ')"></div>' : '');*/
            
            if (note.isTrashed()) {
                el.className += " trashed";
            }
            
            return el;
        }
        
        function sortNotes(notes, sortby, isDesc) {
            if (!sortby) return notes;
            
            notes.sort(function(a, b){
                var valA = a['data_' + sortby] || (sortby == "title" && a['data_text']) || '',
                    valB = b['data_' + sortby] || (sortby == "title" && b['data_text']) || '';
                
                return valA > valB? (isDesc?-1:1)*1 : valA < valB? (isDesc?1:-1)*1 : 0;
            });
            
            return notes;
        }
        
        // the click is captured on the entire list,
        // and we extract the specific note from the event target
        function clickNote(e) {
            var elNote = e.target;
            while (elNote && elNote.tagName != "LI") {
                elNote = elNote.parentNode;
            }
            
            if (elNote) {
                onClickNote && onClickNote(elNote.dataset.noteId, currentNotebook);
            } else if (TIME_FOR_NEW_NOTE_DOUBLECLICK) {
                if (currentNotebook && (createNoteOnTap || el.classList.contains(EMPTY_CONTENT_CLASS))) {
                    App.newNote(currentNotebook);
                } else {
                    createNoteOnTap = true;
                    window.setTimeout(function(){
                        createNoteOnTap = false;
                    }, TIME_FOR_NEW_NOTE_DOUBLECLICK);
                }
            }
        }
    };
    
    var ResourceView = new function() {
        var _this = this,
            el = null, elImage = null, elName = null,
            currentResource = null, onDelete = null;
            
        var CLASS_WHEN_VISIBLE = "visible";
            
        this.init = function(options) {
            el = options.container;
            onDelete = options.onDelete;
            
            elImage = el.querySelector(".image");
            elName = el.querySelector(".name");
            
            el.querySelector("#button-resource-close").addEventListener("click", _this.hide);
            el.querySelector("#button-resource-delete").addEventListener("click", _this.del);
        };
        
        this.show = function(resource) {
            elImage.style.backgroundImage = 'url(' + resource.getSrc() + ')';
            html(elName, resource.getName());
            
            el.classList.add(CLASS_WHEN_VISIBLE);
            
            currentResource = resource;
        };
        
        this.hide = function() {
            el.classList.remove(CLASS_WHEN_VISIBLE);
        };
        
        this.del = function() {
            currentResource && onDelete && onDelete(currentResource);
        };
    };
    
    var NoteActions = new function() {
        var _this = this,
            el = null,
            onBeforeAction = null, onAfterAction = null;
            
        this.init = function(options) {
            el = options.el;
            onBeforeAction = options.onBeforeAction;
            onAfterAction = options.onAfterAction;
            
            elType = el.querySelector(".type");
            elPhoto = el.querySelector(".photo");
            elInfo = el.querySelector(".info");
            elShare = el.querySelector(".share");
            elDelete = el.querySelector(".delete");
            
            elType.addEventListener("click", actionType);
            elPhoto.addEventListener("click", actionPhoto);
            elInfo.addEventListener("click", actionInfo);
            elShare.addEventListener("click", actionShare);
            elDelete.addEventListener("click", actionDelete);
        };
        
        function actionType() {
            onBeforeAction && onBeforeAction("type");
            
            onAfterAction && onAfterAction("type");
        }
        
        function actionPhoto() {
            onBeforeAction && onBeforeAction("photo");
            
            if ("MozActivity" in window) {
                var act = new MozActivity({
                    'name': 'pick',
                    'data': {
                        'type': 'image/jpeg',
                        'width': 320,
                        'height': 480
                    }
                });
                
                function reopenApp() {
                    navigator.mozApps.getSelf().onsuccess = function getSelfCB(evt) {
                        var app = evt.target.result;
                        app.launch();
                    };
                };
                act.onsuccess = function() {
                    if (!act.result.url) return;
                        
                    reopenApp();
                    
                    onAfterAction && onAfterAction("photo", {
                        "name": "Photo",
                        "src": act.result.url,
                        "size": 0
                    });
                };
            } else {
                onAfterAction && onAfterAction("photo", {
                    "name": "DCIM/img_asckjbasckbkasjcnascaschkbascasc.jpg",
                    "src": "http://www.cbc.ca/sevenwonders/images/pic_wonder_prairie_sky_lg.jpg",
                    "size": 82364,
                    "type": "image/jpeg"
                });
            }
        }
        
        function actionInfo() {
            onBeforeAction && onBeforeAction("info");
            
            onAfterAction && onAfterAction("info");
        }
        
        function actionShare() {
            onBeforeAction && onBeforeAction("share");
            
            
            var act = new MozActivity({
                'name': 'new',
                'data': {
                    'type': 'mail',
                    'URI': "mailto:?subject=My+Note&body=" + encodeURIComponent($("note-content").value)
                }
            });
            act.onsuccess = function(e){ };
            act.onerror = function(e){ };
            
            
            onAfterAction && onAfterAction("share");
        }
        
        function actionDelete() {
            onBeforeAction && onBeforeAction("delete");
            
            if (confirm(TEXTS.CONFIRM_TRASH_NOTE)) {
                NoteView.getCurrentNote().trash(function onSuccess() {
                    onAfterAction && onAfterAction("delete", true);
                }, function onError() {
                    
                });
            } else {
                onAfterAction && onAfterAction("delete", false);
            }
        }
    };
    
    var Notification = new function() {
        var _this = this,
            el = null, timeoutHide = null;
            
        var CLASS_WHEN_VISIBLE = "visible",
            TIME_TO_SHOW = 4000;
            
        this.init = function(options) {
            el = document.createElement("div");
            el.className = "notifier";
            
            options.container.appendChild(el);
        };
        
        this.show = function(message) {
            if (!el) return;
            
            window.clearTimeout(timeoutHide);
            
            el.innerHTML = message;
            el.classList.add(CLASS_WHEN_VISIBLE);
            
            timeoutHide = window.setTimeout(_this.hide, TIME_TO_SHOW);
        };
        
        this.hide = function() {
            if (!el) return;
            
            window.clearTimeout(timeoutHide);
            el.classList.remove(CLASS_WHEN_VISIBLE);
        };
    }
    
    var SearchHandler = new function() {
        var notebookBeforeSearch = null;
        
        this.open = function() {
            NotebookView.scrollTop(0);
            Searcher.focus();
        };
        
        this.onSearch = function(items, keyword, fields) {
            if (items.length > 0) {
                var elList = NotebookView.printNotes(items);
                
                window.setTimeout(function(){
                    markOccurences(elList, keyword, fields);
                }, 0);
            } else {
                if (!keyword) {
                    showPreviousNotebook(true);
                } else {
                    NotebookView.printNotes([]);
                }
            }
        };
        
        this.onFocus = function(e) {
            document.body.classList.add(CLASS_SEARCH_RESULTS);
            
            var _currentNotebook = NotebookView.getCurrent();
            if (_currentNotebook) {
                notebookBeforeSearch = _currentNotebook;
            }
            
            user.getNotes({}, function onSuccess(notes){
                Searcher.setData(notes);
            }, function onError() {
                
            });
        };
        
        this.onBlur = function(e) {
            document.body.classList.remove(CLASS_SEARCH_RESULTS);
            if (!Searcher.value()) {
                showPreviousNotebook(true);
            }
        };
        
        function showPreviousNotebook(hideSearch) {
            NotebookView.show(notebookBeforeSearch, null, hideSearch);
        }
        
        function markOccurences(elList, keyword, fields) {
            var els = elList.childNodes,
                regex = new RegExp("(" + keyword + ")", "ig");
                
            for (var i=0,l=els.length; i<l; i++) {
                for (var j=0; j<fields.length; j++) {
                    var el = els[i].getElementsByClassName(fields[j]);
                    if (el && el.length > 0) {
                        el = el[0];
                        el.innerHTML = el.innerHTML.replace(regex, '<b>$1</b>');
                    }
                }
            }
        }
    }

    var Sorter = new function() {
        var _this = this,
            el = null, elOptionNotebook = null,
            currentOrder = "", currentDesc = false, onChange = null;
            
        this.ORDER = {};
        
        this.init = function(options) {
            this.ORDER = options.orders;
            onChange = options.onChange;
            createElement(options.container);
        };
        
        this.show = function() {
            el.focus();
        };
        
        /* these don't work on B2G, since they create a new element of their own.
         * the created element should take the visibility from the actual options
         */
        this.showSortByNotebook = function() {
            elOptionNotebook.style.display = "block";
        };
        this.hideSortByNotebook = function() {
            elOptionNotebook.style.display = "none";
        };
        
        function createElement(parent) {
            if (el) return;
            
            el = document.createElement("select");
            
            el.addEventListener("change", el.blur);
            el.addEventListener("blur", select);
            
            var html = '';
            for (var i=0; i<_this.ORDER.length; i++) {
                var order = _this.ORDER[i],
                    option = document.createElement("option");
                    
                option.value = order.property;
                option.innerHTML = order.label;
                option.setAttribute("data-descending", order.descending);
                
                if (option.value == "notebook_id") {
                    elOptionNotebook = option;
                }
                
                el.appendChild(option);
            }
            
            _this.hideSortByNotebook();
            
            parent.appendChild(el);
        }
        
        function select() {
            var options = el.childNodes,
                sortby = "",
                isDescending = false;
                
            for (var i=0,l=options.length; i<l; i++) {
                if (options[i].selected) {
                    sortby = options[i].value;
                    isDescending = options[i].getAttribute("data-descending") == "true";
                    break;
                }
            }
            
            if (currentOrder != sortby) {
                currentOrder = sortby;
                currentDesc = isDescending;
                onChange && onChange(currentOrder, currentDesc);
            }
        }
    };
};

function readableFilesize(size) {
    var sizes = ["kb", "mb", "gb", "tb"];
    
    for (var i=0; i<sizes.length; i++) {
        size = Math.round(size/1000);
        if (size < 1000) {
            return size + sizes[i];
        }
    }
}

/* taken from the email app */
function prettyDate(time) {
  switch (time.constructor) {
    case String:
      time = parseInt(time);
      break;
    case Date:
      time = time.getTime();
      break;
  }
  
  var f = navigator.mozL10n? new navigator.mozL10n.DateTimeFormat() : null;
  var diff = (Date.now() - time) / 1000;
  var day_diff = Math.floor(diff / 86400);
  
  if (isNaN(day_diff))
    return '(incorrect date)';

  if (day_diff < 0 || diff < 0) {
    // future time
    return f.localeFormat(new Date(time), _('shortDateTimeFormat'));
  }
  
  return day_diff == 0 && (
    diff < 60 && 'Just Now' ||
    diff < 120 && '1 Minute Ago' ||
    diff < 3600 && Math.floor(diff / 60) + ' Minutes Ago' ||
    diff < 7200 && '1 Hour Ago' ||
    diff < 86400 && Math.floor(diff / 3600) + ' Hours Ago') ||
    day_diff == 1 && 'Yesterday' ||
    day_diff < 7 && f.localeFormat(new Date(time), '%A') ||
    f.localeFormat(new Date(time), '%x');
}

function $(s) { return document.getElementById(s); }
function html(el, s) { el.innerHTML = (s || "").replace(/</g, '&lt;'); }
