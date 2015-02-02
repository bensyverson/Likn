"use strict";

/**  @const {number} */ var KeyUpThrottle = 300;



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
		return Object.keys(docs)
				.map(function(aKey){
					return docs[aKey];
				});
	};

	var updateDoc = function(aDoc) {
		docs = getDocs();
		docs[aDoc.uuid] = aDoc;
		println("Storing '" + aDoc.name + "'");
		println(JSON.stringify(docs));
		localStorage['net.likn.docs'] = JSON.stringify(docs);
	};

	var createDocument = function(name) {
		UUID.shared().generate(function(uuid){
			var aDoc = new MarkdownDocument(name, '', uuid);
			updateDoc(aDoc);
		});
	};

	(function(){
		var activeSearch = '';
		var aSearchField = document.getElementById('searchField');

		var performSearch = function(searchTerm) {
			return getListOfDocs()
					.filter(function(aDoc) {
						var thisName = app.makeSearchFriendly(aDoc.title);
						return (thisName.indexOf(searchTerm) != -1);
					});
		};

		var keyupHandler = function(e){
			println("Val: vs activeSearch '" + activeSearch + "'");
			var val = app.makeSearchFriendly(aSearchField.value);
			e = e || event;
			println(e.keyCode);

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
				search.update();
			}
		};

		var keydownHandler = function(e) {
			if (e.keyCode == 13) {
				e.preventDefault();
				createDocument(aSearchField.value);
				return false;
			}
		};

		aSearchField.addEventListener('keyup', _.throttle(keyupHandler, 300));
		aSearchField.addEventListener('keydown', keydownHandler);
	})();
};



