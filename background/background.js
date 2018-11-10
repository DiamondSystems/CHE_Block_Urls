/**
 * Main background object
 *
 * @var {object} chrome
 *
 * @author DiamondSystems <me@diamondsystems.org>
 */
var objDsBg = objDsBg || {
    tabUrls: this.tabUrls || {},
    tabUrlsQ: [],
    urls: this.urls || {},
    tabs: this.tabs || {},
    storage: chrome.storage.sync,

    wrCallbacks: {
        allTabs: function(info) {
            objDsBg.addBlockUrlStatistics(info.tabId, info.url);
            return {cancel: true};
        },
        noneUrls: []
    },

    checkTabUrl: function(url, tabUrl)
    {
        var mT1 = url.match(/^(https?):\/\/(.+?)\/(.*?)$/),
            mT2 = tabUrl.match(/^(https?):\/\/(.+?)\/(.*?)(\*)?$/);

        if (!mT1 || !mT2 || mT1[1] !== mT2[1])
            return false;

        if (mT2[2] !== '*' && mT1[2] !== mT2[2])
            return false;

        if (mT1[3] !== mT2[3]) {
            if (mT1[3] === undefined && mT2[3] !== undefined)
                return false;
            else if (mT1[3] !== undefined && mT2[3] === undefined) {
                if (mT2[4] !== '*')
                    return false;
            }
            else if (mT1[3].indexOf(mT2[3], 0) === -1 || mT2[4] !== '*')
                return false;
        }

        return true;
    },

    getData: function(callback)
    {
        var me = objDsBg;

        objFunDS.getDb('tabs', function (data, cnt) {
            // tabs list
            if (cnt) {
                for (var kt in data)
                    me.tabUrls[kt] = { tabUrl: data[kt], qUrls: [] };
            }

            // tab urls
            objFunDS.getDb('urls', function (data, cnt) {
                if (!cnt)
                    return;

                var sortUrls = [];
                for (var ku in data)
                {
                    switch (data[ku].type)
                    {
                        case 'all':
                            sortUrls.push(data[ku].url);
                            break;

                        case 'none':
                            me.addUrlTabs(data[ku].url, data[ku].tabs);
                            break;

                        case 'list':
                            me.addQueryUrl(data[ku].url, data[ku].tabs);
                            break;

                        default: continue;
                    }
                    delete data[ku];
                }
                // All URLs
                if (sortUrls.length)
                    chrome.webRequest.onBeforeRequest.addListener(me.wrCallbacks.allTabs, {urls: sortUrls}, ["blocking"]);

                // load callback function
                callback();
            });
        });
    },

    addUrlTabs: function(url, tabs)
    {
        var x1 = tabs.length,
            me = objDsBg,
            nuCnt = me.wrCallbacks.noneUrls.length;

        me.wrCallbacks.noneUrls.push(function(info) {
            for (var i=0;i<x1; i++)
                if (me.checkTabUrl(me.tabs[info.tabId].tabUrl, me.tabUrls[tabs[i]].tabUrl))
                    return {cancel: false};
            me.addBlockUrlStatistics(info.tabId, info.url);
            return {cancel: true};
        });

        chrome.webRequest.onBeforeRequest.addListener(me.wrCallbacks.noneUrls[nuCnt], {urls: [url]}, ["blocking"]);
    },

    addQueryUrl: function(url, tabs)
    {
        var x1  = tabs.length,
            key = 's'+Object.keys(this.urls).length;

        this.urls[key] = url;

        for (var i=0;i<x1; i++) {
            this.tabUrls[tabs[i]].qUrls.push(key);
            if (this.tabUrlsQ.indexOf(tabs[i]) === -1)
                this.tabUrlsQ.push(tabs[i]);
        }
    },

    addTab: function(tabId, url, isLoading)
    {
        // check tab
        if (tabId in this.tabs) {
            if (this.tabs[tabId].tabUrl === url) {
                if (isLoading) {
                    this.tabs[tabId].blockUrls = {};
                    this.tabs[tabId].buCnt = 0;
                }
                return;
            }
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

        // search blocked url
        var i,blockUrls=[];
        for (i=0; i<x1; i++)
        {
            if (! this.checkTabUrl(url, this.tabUrls[this.tabUrlsQ[i]].tabUrl))
                continue;

            var ids = this.tabUrls[this.tabUrlsQ[i]].qUrls,
                x2  = ids.length;
            for (var i2=0; i2<x2; i2++)
                blockUrls.push(this.urls[ids[i2]]);
        }

        if (blockUrls.length)
        {
            var fnName = 'fn_'+tabId;

            this.tabs[tabId][fnName] = function(info) {
                objDsBg.addBlockUrlStatistics(info.tabId, info.url);
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

    removeAllWebRequest: function()
    {
        var me = objDsBg;

        // All tabs URLs
        chrome.webRequest.onBeforeRequest.removeListener(me.wrCallbacks.allTabs);

        // None tabs URLs
        for (var i=0; i<me.wrCallbacks.noneUrls.length; i++)
            chrome.webRequest.onBeforeRequest.removeListener(me.wrCallbacks.noneUrls[i]);

        // List tabs URLs
        chrome.tabs.query({}, function(tab) {
            var i,l=tab.length;
            for (i=0; i<l; i++) {
                if (tab[i].id in me.tabs) {
                    chrome.webRequest.onBeforeRequest.removeListener(me.tabs[tab[i].id]['fn_'+tab[i].id]);
                    delete me.tabs[tab[i].id];
                }
            }
        });
    },

    tabsQuery: function()
    {
        var me = objDsBg;
        chrome.tabs.query({}, function(tab) {
            var i,l=tab.length;
            for (i=0;i<l;i++)
                me.addTab(tab[i].id, tab[i].url, true);
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
        var me = objDsBg;

        // get all tabs
        this.tabsQuery();
        chrome.runtime.onInstalled.addListener(function () {
            me.tabsQuery();
        });

        // tab events
        chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
            me.addTab(tabId, tab.url, ('status' in changeInfo && changeInfo.status === 'loading'));
        });
        chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {
            me.deleteTab(tabId);
        });
        chrome.tabs.onReplaced.addListener(function (addedTabId, removedTabId) {
            me.deleteTab(removedTabId);
        });

        // message listeners
        chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
            if (typeof request.optPage !== "string" || request.optPage !== "reload")
                return;
            me.removeAllWebRequest();
            me.getData(function(){
                me.tabsQuery();
            });
        });
    },

    init: function()
    {
        var me = objDsBg;
        me.getData(function(){
            me.startLogic();
        });

        // set default popup
        chrome.browserAction.setPopup({'popup':'popup/popup.html'});
    }
};

/**
 * Init script
 */
objDsBg.init();