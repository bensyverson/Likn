"use strict";


// var client = new Dropbox.Client({ key: "stutb1ia0qe4kjw" });

// client.authenticate(function(error, client) {
//   if (error) {
// 	return;
//   }
// 	println(client);
// });



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


/**
 * Simple control wrapper
 * @param {Object} anElement The original element (optional)
 * @constructor
 * @extends UIView
 */
var Likn = function(aViewController) {
	var self = this;
	App.call(this, aViewController);
	self.selectedIndex = -1;

	self.docList = [];

	if (self) {
		this.editor = null;
		this.searchField = null;

		this.keyboardNavHandler = function(e) {
			switch(e.keyCode) {
				case NetLiknDownArrowKey:
				case NetLiknTabKey:
					self.selectedIndex ++;
					self.selectSubview();
					break;
				case NetLiknUpArrowKey:
					self.selectedIndex --;
					self.selectSubview();
					break;
				case NetLiknEnterKey:
					window.removeEventListener('keydown', self.keyboardNavHandler);
					self.editSelectedDocument();
					break;
				case NetLiknDeleteKey:
					self.searchField.value = self.searchField.value.substr(0, self.searchField.value.length - 1);
					self.searchField.focus();
					e.preventDefault();
					return false;
				default:
					break;
			}
		};
	}
};

Likn.prototype = Object.create(App.prototype);
Likn.prototype.constructor = Likn;

Likn.prototype.init = function() {
	var self = this;

	self.editor = new EpicEditor().load();
	self.editor.preview();

	self.editor.on('update', function(){
		var theContent = self.editor.exportFile();
		var aDoc = self.docList[self.selectedIndex];
		aDoc.body = theContent;
		self.updateDoc(aDoc);
		println("Updating doc.----------------------------");
	});


	App.prototype.init.call(this);
};

Likn.prototype.getDocs = function() {
	var self = this;
	return (localStorage['net.likn.docs']) ? JSON.parse(localStorage['net.likn.docs']) : {};
};

Likn.prototype.getListOfDocs = function() {
	var self = this;
	var someDocs = self.getDocs();
	return Object.keys(someDocs)
			.map(function(aKey){
				return someDocs[aKey];
			});
};



Likn.prototype.createDocument = function(name) {
	var self = this;
	UUID.shared().generate(function(uuid){		
		println("Updating doc -----------------");
		var newDoc = new MarkdownDocument(name, '# ' + name, uuid);
		self.updateDoc(newDoc);

		self.activeSearch = null;
		self.refreshSearchResults(function(){
			self.selectDoc(newDoc, true);
			self.editor.focus();
		});
	});
};


Likn.prototype.switchToKeyboardNav = function() {
	var self = this;
	println("SWITHING TO KEYBOARD NAV");
	self.searchField.blur();
	window.addEventListener('keydown', self.keyboardNavHandler);
};



Likn.prototype.selectSubview = function(anIndex, shouldEdit) {
	var self = this;

	var search = self.rootViewController().view;
	self.selectedIndex = (typeof anIndex === 'undefined') ? self.selectedIndex : anIndex;
	println("Selecting " + self.selectedIndex + " should edit? " + shouldEdit);
	if (self.selectedIndex == -1) {
		var temp = self.searchField.value;
		self.searchField.value = '';
		self.searchField.focus();
		self.searchField.value =  temp;
	}
	self.selectedIndex = Math.min(self.selectedIndex, search.subviews.length - 1);
	for (var i = 0; i < search.subviews.length; i++) {
		var aSubview = search.subviews[i];
		if (i == self.selectedIndex) {
			aSubview.element().addClassName('selected');
			self.editor.importFile(self.docList[i].uuid, self.docList[i].body);
			self.editor.open(self.docList[i].uuid);
			if (shouldEdit) {
				self.editor.edit();
				self.editor.focus();
			}  else {
				self.editor.preview();
			}
		} else {
			aSubview.element().removeClassName('selected');
		}
	}
};


Likn.prototype.updateDoc = function(aDoc) {
	var self = this;
	if (aDoc) {
		var allDocs = self.getDocs();
		allDocs[aDoc.uuid] = aDoc;
		localStorage['net.likn.docs'] = JSON.stringify(allDocs);
	}
};


Likn.prototype.performSearch = function(searchTerm) {
	var self = this;
	self.docList = self.getListOfDocs()
			.filter(function(aDoc) {
				var thisName = self.makeSearchFriendly(aDoc.title);
				return (thisName.indexOf(searchTerm) != -1);
			});
	return self.docList;
};

Likn.prototype.selectDoc = function(newDoc, shouldEdit) {
	var self = this;
	for (var i = 0; i < self.docList.length; i++) {
		var aDoc = self.docList[i];
		if (aDoc.uuid == newDoc.uuid) {
			println("Selecting subview " + i + " should edit? " + shouldEdit);
			if (!shouldEdit) self.switchToKeyboardNav();
			self.selectSubview(i, shouldEdit);
			break;
		} else {
			println(aDoc.uuid + " doesn't match " + newDoc.uuid);
		}
	}
};

Likn.prototype.viewClicked = function(aView) {
	var self = this;
	if ('doc' in aView) {
		self.selectDoc(aView['doc']);
	}
};

Likn.prototype.refreshSearchResults = function(cb) {
	var self = this;
	println("refresh search.");
	var search = self.rootViewController().view;
	var val = self.makeSearchFriendly(self.searchField.value);
	if (self.activeSearch != val) {
		self.activeSearch = val;
		search.removeAllSubviews();
		if (self.activeSearch != '') {
			var resultViews = self.performSearch(val)
				.map(function(aDoc){
					return new SearchResultView(null, aDoc);;
				});

			while (resultViews[0]){
				search.addSubview(resultViews.shift());
			}
		}
		search.update(function(){
			println("returned with " + search.subviews.length + " views");
			for (var i = 0; i < search.subviews.length; i++){
				var aView = search.subviews[i];
				var makeClicker = function(v) {
					return function(x){
						self.viewClicked(v);
					};
				};
				aView.element().addEventListener('click', makeClicker(aView));
			}
			if (cb) cb();
		});
	} else {
		println("skipping.");
	}
};


Likn.prototype.editSelectedDocument = function() {
	var self = this;
	self.editor.edit();
};



var load = function() {
	var index = new View('templates/search.html', 'ok');
	var viewController = new ViewController('/', index);

	var app = new Likn(viewController);

	var searchResultsElement = document.getElementById('resultList');
	var aSearchField = document.getElementById('searchField');
	app.searchField = aSearchField;


	var keyupHandler = function(e){
		e = e || event;
		println("keyup handler");
		app.refreshSearchResults();
	};

	var keydownHandler = function(e) {
		println("keydown handler");
		window.removeEventListener('keydown', app.keyboardNavHandler);
		app.selectedIndex = -1;
		if (e.keyCode == NetLiknEnterKey) {
			e.preventDefault();
			app.createDocument(app.searchField.value);
			return false;
		} else if (	(e.keyCode == NetLiknDownArrowKey) ||
					(e.keyCode == NetLiknTabKey)) {
			app.switchToKeyboardNav();
		}
	};


	aSearchField.addEventListener('keyup', _.throttle(keyupHandler, 100));
	aSearchField.addEventListener('keydown', keydownHandler);


	app.rootViewController().view.bindToAppElement(app, searchResultsElement, function(error, html) {
		println("bound.");
		app.init();
		app.docs = app.getDocs();
	});


};
