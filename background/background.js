/**
 * Main object
 */
var objDS = objDS || {
    tabUrls: this.tabUrls || {},
    tabUrlsQ: [],
    urls: this.urls || {},
    tabs: this.tabs || {},
    storage: chrome.storage.sync,

    getData: function()
    {
        var me = this;
        this.storage.get(['urls','tabs'], function (res) {
            // check urls list
            if (typeof res.urls !== "object" || !Object.keys(res.urls).length)
                return;

            // tabs list
            for (var kt in res.tabs)
                me.tabUrls[kt] = { tabUrl: res.tabs[kt], qUrls: [] };

            // get tab urls
            var sortUrls = [];
            for (var ku in res.urls)
            {
                switch (res.urls[ku].type)
                {
                    case 'all':
                        sortUrls.push(ku);
                        break;

                    case 'not':
                        me.addUrlTabs(ku, res.urls[ku].tabs);
                        break;

                    case 'list':
                        me.addQueryUrl(ku, res.urls[ku].tabs);
                        break;

                    default: continue;
                }
                delete res.urls[ku];
            }
            if (sortUrls.length)
                me.addAllTabs(sortUrls);
        });
    },

    addAllTabs: function(urls)
    {
        var me = this;
        chrome.webRequest.onBeforeRequest.addListener(function(info) {
            me.addBlockUrlStatistics(info.tabId, info.url);
            return {cancel: true};
        }, {urls: urls}, ["blocking"]);
    },

    addUrlTabs: function(url, tabs)
    {
        var x1 = tabs.length,
            me = this;

        chrome.webRequest.onBeforeRequest.addListener(function(info) {
            for (var i=0;i<x1; i++)
                if (me.tabUrls[tabs[i]].tabUrl === me.tabs[info.tabId].tabUrl)
                    return {cancel: false};
            me.addBlockUrlStatistics(info.tabId, info.url);
            return {cancel: true};
        }, {urls: [url]}, ["blocking"]);
    },

    addQueryUrl: function(url, tabs)
    {
        var x1  = tabs.length,
            key = 's'+Object.keys(this.urls).length;

        this.urls[key] = url;

        for (var i=0;i<x1; i++)
        {
            this.tabUrls[tabs[i]].qUrls.push(key);
            if (this.tabUrlsQ.indexOf(tabs[i]) === -1)
                this.tabUrlsQ.push(tabs[i]);
        }
    },

    addTab: function(tabId, url)
    {
        // check tab
        if (tabId in this.tabs) {
            if (this.tabs[tabId].tabUrl === url)
                return;
            this.deleteTab(tabId);
        }

        // save tab url
        this.tabs[tabId] = {
            tabUrl: url,
            blockUrls: {},
            buCnt: 0
        };

        // check query tabs count
        var x1 = this.tabUrlsQ.length;
        if (!x1)
            return;

        // check query tab url
        var mT1 = url.match(/^(https?):\/\/(.+?)\/(.*?)$/);
        if (!mT1)
            return;

        // search blocked url
        var i,mT2,blockUrls=[];
        for (i=0; i<x1; i++)
        {
            mT2 = this.tabUrls[this.tabUrlsQ[i]].tabUrl.match(/^(https?):\/\/(.+?)\/(.*?)(\*)?$/);
            if (!mT2 || mT1[1] !== mT2[1] || mT1[2] !== mT2[2])
                continue;
            if (mT1[3] !== mT2[3]) {
                if (mT1[3] === undefined && mT2[3] !== undefined)
                    continue;
                else if (mT1[3] !== undefined && mT2[3] === undefined) {
                    if (mT2[4] !== '*')
                        continue;
                }
                else if (mT1[3].indexOf(mT2[3], 0) === -1 || mT2[4] !== '*')
                    continue;
            }
            // // Old version
            // if (this.tabUrls[this.tabUrlsQ[i]].tabUrl !== url)
            //     continue;

            var ids = this.tabUrls[this.tabUrlsQ[i]].qUrls,
                x2  = ids.length;
            for (var i2=0; i2<x2; i2++)
                blockUrls.push(this.urls[ids[i2]]);
        }
        if (blockUrls.length)
        {
            var fnName = 'fn_'+tabId,
                me = this;

            this.tabs[tabId][fnName] = function(info) {
                me.addBlockUrlStatistics(info.tabId, info.url);
                return {cancel: true};
            };
            chrome.webRequest.onBeforeRequest.addListener(this.tabs[tabId][fnName], {urls: blockUrls, tabId: tabId}, ["blocking"]);
        }
    },

    deleteTab: function(tabId)
    {
        if (tabId in this.tabs) {
            // if (chrome.webRequest.onBeforeRequest.hasListener(this.tabs[tabId]['fn_'+tabId]))
            chrome.webRequest.onBeforeRequest.removeListener(this.tabs[tabId]['fn_'+tabId]);
            delete this.tabs[tabId];
        }
    },

    tabsQuery: function()
    {
        var me = this;
        chrome.tabs.query({}, function(tab) {
            var i,l=tab.length;
            for (i=0;i<l;i++)
                me.addTab(tab[i].id, tab[i].url);
        });
    },

    addBlockUrlStatistics: function (tabId, url)
    {
        // Show count block urls
        chrome.browserAction.setBadgeText({
            text: (++this.tabs[tabId].buCnt).toString(),
            tabId: tabId
        });
        // Save url info
        var bu = this.tabs[tabId].blockUrls;
        bu[url] = (url in bu) ? bu[url]+1 : 1;
    },

    startLogic: function()
    {
        var me = this;

        // get all tabs
        this.tabsQuery();
        chrome.runtime.onInstalled.addListener(function () {
            me.tabsQuery();
        });

        // tab events
        chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
            me.addTab(tabId, tab.url);
        });
        chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {
            me.deleteTab(tabId);
        });
        chrome.tabs.onReplaced.addListener(function (addedTabId, removedTabId) {
            me.deleteTab(removedTabId);
        });

        //============ TESTs ============//

        // chrome.browserAction.onClicked.addListener(function (tab) {
        //     console.log(tab);
        // });
    },

    init: function()
    {
        this.getData();
        this.startLogic();
    }
};

//================ START ================//

objDS.storage.set({
    // https://developer.chrome.com/extensions/match_patterns
    urls: {
        '*://gc.kis.v2.scr.kaspersky-labs.com/*': {
            type: 'list',
            tabs: ['1', '2', '3']
        }

        // --- Example ---
        // 'http://chrome.loc': {
        //     type: 'list',
        //     tabs: ['123']
        // },
        // 'http://1.test.loc/*': {
        //     type: 'not',
        //     tabs: ['456','789']
        // },
        // 'http://2.test.loc/*': {
        //     type: 'not',
        //     tabs: ['456','789']
        // },
        // 'http://3.test.loc/*': {
        //     type: 'not',
        //     tabs: ['456']
        // },
        // '*://gc.kis.v2.scr.kaspersky-labs.com/*': {
        //     type: 'all',
        //     tabs: []
        // }
    },
    // browser tab url address
    tabs: {
        '1': 'http://doc.extjs.loc/*',
        '2': 'http://doc.laravel.loc/*',
        '3': 'http://9.test.loc/*'

        // --- Example ---
        // '1': 'https://doc.laravel.loc/',
        // '2': 'http://doc.extjs.loc/',
        // '3': 'http://doc.extjs.loc/*',
        // '4': 'http://doc.extjs.loc/Ext.html'
    }
});
objDS.init();