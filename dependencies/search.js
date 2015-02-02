"use strict";

Element.prototype.hasClassName = function(name) {
    return new RegExp("(?:^|\\s+)" + name + "(?:\\s+|$)").test(this.className);
};

Element.prototype.addClassName = function(name) {
    if (!this.hasClassName(name)) {
        this.className = this.className ? [this.className, name].join(' ') : name;
    }
};

Element.prototype.removeClassName = function(name) {
    if (this.hasClassName(name)) {
        var c = this.className;
        this.className = c.replace(new RegExp("(?:^|\\s+)" + name + "(?:\\s+|$)", "g"), "");
    }
};


/** @const {number} */ var KeyUpThrottle = 300;
/** @const {number} */ var NetLiknEnterKey = 13;
/** @const {number} */ var NetLiknUpArrowKey = 38;
/** @const {number} */ var NetLiknDownArrowKey = 40;
/** @const {number} */ var NetLiknTabKey = 9;
/** @const {number} */ var NetLiknDeleteKey = 8;



/**
 * SearchResult
 * @constructor
 */
var MarkdownDocument = function(aTitle, aBody, aUUID) {
	this.title = aTitle || 'Untitled';
	this.body = aBody || '';

	if (!aUUID) {
		println("WARNING: Initializing Markdown Document without UUID");
	}
	this.uuid = aUUID || 'nonunique';
};

/**
 * SearchResult
 * @constructor
 */
var SearchResult = function(aTitle, aBody, aURL, anIcon) {
	// TODO
	this.title = aTitle || '';
	this.body = aBody || '';
	this.url = aURL || '';
	this.icon = anIcon || '';
};


/**
 * Simple control wrapper
 * @param {Object} anElement The original element (optional)
 * @constructor
 * @extends UIView
 */
var SearchResultView = function(templateName, aDoc, cb) {
	var self = this;
	View.call(this, templateName || 'templates/searchResult.html', 'Search Result', cb);
	if (self) {
		this.doc = aDoc || new MarkdownDocument();
	}
};

SearchResultView.prototype = Object.create(View.prototype);
SearchResultView.prototype.constructor = SearchResultView;

SearchResultView.prototype.updateLocals = function(cb) {
	var self = this;

	self.locals['title'] = self.doc.title;
	self.locals['body'] = self.doc.body;

	View.prototype.updateLocals.call(this, cb);
};




var load = function() {
	var editor = new EpicEditor().load();
	editor.preview();

	var index = new View('templates/search.html', 'ok');

	// var search = new View('../templates/search.html', 'SearchView');

	var viewController = new ViewController('/', index);

	var app = new App(viewController);

	var getDocs = function() {
		return (localStorage['net.likn.docs']) ? JSON.parse(localStorage['net.likn.docs']) : {};
	};
	var docs = getDocs();

	var docList = [];

	var searchResultsElement = document.getElementById('resultList');
	var search = app.rootViewController().view;

	app.rootViewController().view.bindToAppElement(app, searchResultsElement, function(error, html) {
		setTimeout(function(e) {
			// red.name = "Fantastical";
			// red.update(function(err, success){
			// });
			search.removeAllSubviews();
		}, 500);
	});


	var getListOfDocs = function() {
		docs = getDocs();
		return Object.keys(docs)
				.map(function(aKey){
					return docs[aKey];
				});
	};



	(function(){
		var activeSearch = '';
		var aSearchField = document.getElementById('searchField');

		var selectedIndex = -1;

		var updateDoc = function(aDoc) {
			println(aDoc);
			if (aDoc) {
				docs = getDocs();
				docs[aDoc.uuid] = aDoc;
				localStorage['net.likn.docs'] = JSON.stringify(docs);
			}
		};

		var createDocument = function(name) {
			UUID.shared().generate(function(uuid){
				
				println("Updating doc -----------------");
				var newDoc = new MarkdownDocument(name, '# ' + name, uuid);
				updateDoc(newDoc);

				activeSearch = null;
				refreshSearchResults(function(){
					println("Selecting " +  newDoc.uuid + " --------------------");
					println("doc list: " + docList.length);
					for (var i = 0; i < docList.length; i++) {
						var aDoc = docList[i];
						if (aDoc.uuid == newDoc.uuid) {
							println("Selecting subview " + i);
							switchToKeyboardNav();
							selectedIndex = i;
							selectSubview();
							break;
						} else {
							println(aDoc.uuid + " doesn't match " + newDoc.uuid);
						}
					}
				});				
			});
		};

		

		var performSearch = function(searchTerm) {
			docList = getListOfDocs()
					.filter(function(aDoc) {
						var thisName = app.makeSearchFriendly(aDoc.title);
						return (thisName.indexOf(searchTerm) != -1);
					});
			return docList;
		};


		var refreshSearchResults = function(cb) {
			var val = app.makeSearchFriendly(aSearchField.value);
			if (activeSearch != val) {
				activeSearch = val;
				search.removeAllSubviews();
				if (activeSearch != '') {
					var resultViews = performSearch(val)
						.map(function(aDoc){
							return new SearchResultView(null, aDoc);
						});

					while (resultViews[0]){
						search.addSubview(resultViews.shift());
					}
				}
				search.update(cb);
			}
		};


		var selectSubview = function() {
			if (selectedIndex == -1) {
				var temp = aSearchField.value;
				aSearchField.value = '';
				aSearchField.focus();
				aSearchField.value =  temp;
			}
			selectedIndex = Math.min(selectedIndex, search.subviews.length - 1);
			for (var i = 0; i < search.subviews.length; i++) {
				var aSubview = search.subviews[i];
				if (i == selectedIndex) {
					aSubview.element().addClassName('selected');
					editor.importFile(docList[i].uuid, docList[i].body);
					editor.open(docList[i].uuid);
					editor.preview();
				} else {
					aSubview.element().removeClassName('selected');
				}
			}
		};

		
		var editSelectedDocument = function() {
			editor.edit();
		};

		editor.on('update', function(){
			var theContent = editor.exportFile();
			var aDoc = docList[selectedIndex];
			aDoc.body = theContent;
			updateDoc(aDoc);
		});


		var keyboardNavHandler = function(e) {
			switch(e.keyCode) {
				case NetLiknDownArrowKey:
				case NetLiknTabKey:
					println('down');
					selectedIndex ++;
					selectSubview();
					break;
				case NetLiknUpArrowKey:
					println('up');
					selectedIndex --;
					selectSubview();
					break;
				case NetLiknEnterKey:
					println('enter');
					editSelectedDocument();
					break;
				case NetLiknDeleteKey:
					println('delete');
					aSearchField.value = aSearchField.value.substr(0, aSearchField.value.length - 1);
					aSearchField.focus();
					e.preventDefault();
					return false;
				default:
					println('?????????');
					break;
			}
		};

		var switchToKeyboardNav = function() {
			aSearchField.blur();
			window.addEventListener('keydown', keyboardNavHandler);
		}


		var keydownHandler = function(e) {
			window.removeEventListener('keydown', keyboardNavHandler);
			selectedIndex = -1;
			if (e.keyCode == NetLiknEnterKey) {
				e.preventDefault();
				createDocument(aSearchField.value);
				return false;
			} else if (	(e.keyCode == NetLiknDownArrowKey) ||
						(e.keyCode == NetLiknTabKey)) {
				switchToKeyboardNav();
			}
		};


		var keyupHandler = function(e){
			e = e || event;
			refreshSearchResults();
		};

		aSearchField.addEventListener('keyup', _.throttle(keyupHandler, 100));
		aSearchField.addEventListener('keydown', keydownHandler);


	})();
};



