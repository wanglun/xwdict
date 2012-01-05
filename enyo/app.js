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
	},

    dictConfig: function(config) {
        console.error("plugin: dictConfig");
        this.callPluginMethodDeferred(enyo.nop, "dictConfig", config['fuzzy'], config['regex'], config['data']);
    }
});

enyo.kind({
	name: "mainView",
	kind: "VFlexBox",
	components: [
		{kind: XwDictPlugin, name: "plugin"},
		{kind: enyo.Toolbar, className:"enyo-toolbar-light accounts-header", pack:"center",
            components: [
			{ kind: "Image", src: "searchpreference_48x48.png"},
            { kind: "Input", name: "word", className: "search-input", inputClassName: "search-input-input", focusClassName: "search-input-focus", oninput: "wordChange", hint: "Please input word", flex: 1},
			]
        },
        {kind: "Scroller", flex: 1, components: [
            {name: "result", content: "", allowHtml: true}]},
	],
	word: "",
    dicts: "",
	
	create: function() {
		this.inherited(arguments);

        // set configs
        var fuzzy = enyo.getCookie('fuzzy') || 0;
        var regex = enyo.getCookie('regex') || 0;
        var data = enyo.getCookie('data') || 0;
        var config = {'fuzzy': fuzzy, 'regex': regex, 'data': data};
        this.$.plugin.dictConfig(config);

        this.$.plugin.dictInfo(enyo.bind(this, 
                function(info) {
                    this.dicts = info;
                    console.error("dictInfo: " + this.dicts);
                    this.$.result.setContent(this.dicts);
                }
                ));
	},

    ler: function() {
        console.error("keydown hanlder");
        this.$.word.forceFocus();
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

enyo.kind({
	name: "preferencesView",
	kind: "VFlexBox",
    className: "basic-back",
	components: [
		{kind: "PageHeader",
            components: [{content: $L("Preferences")}]
        },
        {kind: "Control", flex: 1, components: [
            {kind: "RowGroup", caption: $L("Content"), style: "margin-bottom: 10px", components: [
                {kind: "LabeledContainer", caption: $L("Fuzzy Search"), components: [
                    {kind: "ToggleButton", name: "fuzzyToggle", onChange: "fuzzyToggleClick"}
                ]},
                {kind: "LabeledContainer", caption: $L("Regex Search"), components: [
                    {kind: "ToggleButton", name: "regexToggle", onChange: "regexToggleClick"}
                ]},
                {kind: "LabeledContainer", caption: $L("Dict Mode"), components: [
                    {kind: "ToggleButton", name: "dictModeToggle", onLabel: $L("Single"), offLabel: $L("Multi"), onChange: "dictModeToggleClick"}
                ]},
            ]},
        ]}
	],
    fuzzyToggleClick: function() {
    },
    regexToggleClick: function() {
    },
    dictModeToggleClick: function() {
    },
});

enyo.kind({
    name: "XwDictApp",
    kind: enyo.VFlexBox,
    components: [
        {kind: "ApplicationEvents", onBack: "backHandler", onKeydown: "keydown"},
        {kind: enyo.Pane, name: "pane", transitionKind: "enyo.transitions.Simple", flex: 1, components: [
                {kind: "mainView", name: "main"},
                {kind: "preferencesView", name: "preferences", lazy: true},
            ]
        },
        {kind: "AppMenu", name: "appMenu", components: [
            {name: "preferencesItem", caption: $L("Preferences"), onclick: "selectPreferencesView"},
        ]},
    ],

    selectPreferencesView: function() {
        this.$.pane.selectViewByName("preferences");
    },

    keydown: function(inSender, e) {
        console.error("keydown");
    },

    backHandler: function(inSender, e) {
        var n = this.$.pane.getViewName();
        switch (n) {
            case 'main':
                break;
            case 'preferences':
                this.$.pane.back(e);
                break;
        }
    },

	isMainShowing: function() {
		return this.$.pane.getViewName() === "main";
	},
	isPreferencesShowing: function() {
		return this.$.pane.getViewName() === "preferences";
	},
	toggleAppMenuItems: function() {
		this.$.preferencesItem.setDisabled(this.isPreferencesShowing());
	},
});
