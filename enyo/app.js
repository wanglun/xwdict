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
		this.addCallback("dictInfoResult", enyo.bind(this, this._infoResultsCallback), true);
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

    _infoCallback: 0,
	_infoResultsCallback: function(wordsJSON) {
		console.error("plugin: dictinfo " + wordsJSON);
		// we rely on the fact that calls to the plugin will result in callbacks happening
		// in the order that the calls were made to do a first-in, first-out queue
		if (this._infoCallback) {
			//this._infoCallback(enyo.json.parse(wordsJSON));
			this._infoCallback(wordsJSON);
		}
		else {
			console.error("FileTreePlugin: got results with no callbacks registered: " + wordsJSON);
		}
	},
	
	dictQuery: function(query, callback) {
		if (window.PalmSystem) {
			console.error("plugin: dictQuery");
			this._resultsCallbacks.push(callback);
			this.callPluginMethodDeferred(enyo.nop, "dictQuery", query);
		}
		else {
			// if not on device, return mock data
			enyo.nextTick(this, function() { callback("test result"); });
		}
	},

	dictInfo: function(callback) {
		if (window.PalmSystem) {
			console.error("plugin: dictInfo");
			this._infoCallback = callback;
			this.callPluginMethodDeferred(enyo.nop, "dictInfo");
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
		{kind: "PageHeader",
            components: [
            {kind: "Input", name: "word", className: "search-input", inputClassName: "search-input-input", focusClassName: "search-input-focus", oninput: "wordChange", hint: "Please input word", flex: 1},
			]
        },
        {kind: "Scroller", flex: 1, components: [
            {name: "result", content: "", allowHtml: true}]}
	],
	word: "",
    dicts: "",
	
	create: function() {
		this.inherited(arguments);
        this.$.plugin.dictInfo(enyo.bind(this, 
                function(info) {
                    this.dicts = info;
                    console.error("dictInfo: " + this.dicts);
                    this.$.result.setContent(this.dicts);
                }
                ));
	},
	
	doQuery: function() {
		this.$.plugin.dictQuery(this.word, enyo.bind(this, this.showResult));
	},
	
	showResult: function(result) {
        var output_result = "";
        for (var i = 0; i < result.length; i++) {
            output_result += result[i].dict + "<br/>" + result[i].word + "<br/>" + enyo.string.escapeHtml(result[i].data);
        }
        this.$.result.setContent(output_result);
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
