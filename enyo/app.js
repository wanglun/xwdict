/* FileTree app.js */

/* Here, we create a specialization of enyo.Hybrid for our FileTree plugin.  This is done to simplify the API for
 * the user. */

enyo.kind({
	name: "XwDictPlugin",
	kind: "enyo.Hybrid",
	width: 0,
	height: 0,
	executable: "xwdict_plugin",

	create: function() {
		this.inherited(arguments);
		// we create this as a deferred callback so we can call back into the
		// plugin immediately
		this.addCallback("dictQueryResult", enyo.bind(this, this._queryResultsCallback), true);
	},
	
	_resultsCallbacks: [],
	_queryResultsCallback: function(wordsJSON) {
		console.error("***** FileTreePlugin: _getFilesResultsCallback");
		// we rely on the fact that calls to the plugin will result in callbacks happening
		// in the order that the calls were made to do a first-in, first-out queue
		var callback = this._resultsCallbacks.shift();
		if (callback) {
			callback(enyo.json.parse(wordsJSON));
		}
		else {
			console.error("FileTreePlugin: got results with no callbacks registered: " + wordsJSON);
		}
	},
	
	dictQuery: function(query, callback) {
		if (window.PalmSystem) {
			console.error("***** FileTreePlugin: getFiles");
			this._resultsCallbacks.push(callback);
			this.callPluginMethodDeferred(enyo.nop, "dictQuery", query);
		}
		else {
			// if not on device, return mock data
			enyo.nextTick(this, function() { callback("test result"); });
		}
	}
});

enyo.kind({
	name: "XwDictApp",
	kind: "VFlexBox",
	components: [
		{kind: XwDictPlugin, name: "plugin"},
		{kind: "PageHeader", components: [
            {kind: "Input", name: "word", oninput: "wordChange", hint: "Please input word", flex: 1},
			{kind: "Button", name: "search", caption: "Search", disabled: false, onclick: "doSearch"}]},
        {name: "result", content: "", allowHtml: true},
	],
	word: "test",
	
	create: function() {
		this.inherited(arguments);
		this.doQuery();
	},
	
	doQuery: function() {
		this.$.plugin.dictQuery(this.word, enyo.bind(this, this.showResult));
	},
	
	showResult: function(result) {
        for (var i = 0; i < 2; i++) {
            this.$.result.setContent(result[i].dict + "<br/>" + result[i].word + "<br/>" + enyo.string.escapeHtml(result[i].data));
        }
	},

    wordChange: function() {
        this.doSearch();
    },
	
	doSearch: function() {
        if (this.word !== this.$.word.getValue()) {
            this.word = this.$.word.getValue();
            if (this.$.word.isEmpty()) {
                this.showResult('');
            } else {
                this.doQuery();
            }
        }
	}
});
