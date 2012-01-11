var default_configs = {
    fuzzy : 0,
    regex : 0,
    data : 0,
};
var dict_configs = {};
enyo.kind({
	name: "XwDictPlugin",
	kind: "enyo.Hybrid",
	width: 0,
	height: 0,
	executable: "xwdict_plugin",

	create: function() {
		this.inherited(arguments);
		this.addCallback("dictQueryResult", enyo.bind(this, this._queryResultsCallback), true);
		this.addCallback("dictInfoResult", enyo.bind(this, this._infoResultsCallback), true);
	},
	
	_resultsCallbacks: [],
	_queryResultsCallback: function(wordsJSON) {
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
		if (this._infoCallback) {
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
        this.callPluginMethodDeferred(enyo.nop, "dictConfig", config.fuzzy, config.regex, config.data);
    },

    pushDict: function(i) {
        console.error("plugin: pushDict");
        this.callPluginMethodDeferred(enyo.nop, "pushDict", i);
    },
});

enyo.kind({
	name: "mainView",
	kind: "VFlexBox",
	components: [
		{kind: XwDictPlugin, name: "plugin"},
        {kind: enyo.ApplicationEvents, onKeydown: "handleKeydown"},
		{kind: enyo.Toolbar, className:"enyo-toolbar-light accounts-header", pack:"center",
            components: [
			{ kind: "Image", src: "images/search.png"},
            { kind: "Input", name: "word", className: "search-input", inputClassName: "search-input-input", focusClassName: "search-input-focus", oninput: "wordChange", hint: "Please input word", flex: 1},
			]
        },
        {kind: "Scroller", flex: 1, components: [
            {name: "result", content: "", allowHtml: true}]},
	],
	word: "",
    dicts: [],

	create: function() {
		this.inherited(arguments);

        // set configs
        dict_configs = enyo.getCookie("configs") && enyo.json.parse(enyo.cookie.getCookie("configs")) || default_configs;
        this.$.plugin.dictConfig(dict_configs);

        this.$.plugin.dictInfo(enyo.bind(this, 
                function(info) {
                    this.dicts = enyo.json.parse(info);
                    this.showHome();

                    // push the dicts
                    this.$.plugin.pushDict(7);
                }
                ));
	},

    showHome: function() {
        var info = "<ul class='dict'>";
        var i, dict;
        for (i = 0; i < this.dicts.length; i++) {
            dict = this.dicts[i];
            info += "<li><span class='bookname'>" + dict.bookname + "</span>";
            info += "<span class='wordcount'>共收录条目: " + dict.wordcount + "条</span>";
            info += "<span class='author'>作者: " + dict.author + "</span></li>";
        }
        info += "</ul>";
        this.$.result.setContent(info);
    },

	handleKeydown: function(s, e) {
		if ( e.keyCode == 13 ) {
            ;
		} else {
			if (!this.$.word.hasFocus()) {
				this.$.word.forceFocus();			
				
				if (e.keyCode === 8) {
					var curVal = this.$.word.getValue();
					if (curVal.length > 0) {
						this.$.word.setValue(curVal.slice(0, -1));
						enyo.asyncMethod(this, "doSearch");
					}
				} else {
					var keyEvent = Utils.keyFromEvent(e);
					if (keyEvent) {
						this.$.word.setValue(this.$.word.getValue() + keyEvent);
						enyo.asyncMethod(this, "doSearch");
					}
				}
			} else {
                enyo.asyncMethod(this, "doSearch");
			}
			
		}
	},

	doQuery: function() {
		this.$.plugin.dictQuery(this.word, enyo.bind(this, this.showResult));
	},
	
	showResult: function(result) {
        var r;
        var out = "<ul class='dict'>";
        for (var i = 0; i < result.length; i++) {
            r = result[i];
            out += "<li><span class='bookname'>" + r.dict + "</span>";
            out += "<span class='word'>" + r.word + "</span>";
            out += "<span class='content'>" + r.data + "</span></li>";
        }
        out += "</ul>";
        this.$.result.setContent(out);
	},

    wordChange: function() {
        this.doSearch();
    },
	
	doSearch: function() {
        if (this.word !== this.$.word.getValue()) {
            this.word = this.$.word.getValue();
            if (this.$.word.isEmpty()) {
                this.showHome();
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
        dict_configs.fuzzy = this.$.fuzzyToggle.getState();
        this.$.plugin.dictConfig(dict_configs);
    },
    regexToggleClick: function() {
        dict_configs.regex = this.$.regexToggle.getState();
        this.$.plugin.dictConfig(dict_configs);
    },
    dictModeToggleClick: function() {
        ;
    },
});

enyo.kind({
    name: "XwDictApp",
    kind: enyo.VFlexBox,
    components: [
        {kind: "ApplicationEvents", onBack: "handleBack"},
        {kind: enyo.Pane, name: "pane", flex: 1, components: [
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

    handleBack: function(s, e) {
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
