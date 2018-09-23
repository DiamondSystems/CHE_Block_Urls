/**
 * Main popup object
 *
 * @var {object} chrome
 *
 * @author DiamondSystems <me@diamondsystems.org>
 */
var objPopupDS = objPopupDS || {

    objBgDS: null,

    setEvents: function()
    {
        // Click - open settings page
        $('#btn_open_settings').click(function(){
            chrome.runtime.openOptionsPage();
        });
    },

    showBlockedUrlTable: function()
    {
        var blt = $('#block_list_table');
        if (blt.is(":hidden")) {
            $('#no_list').hide();
            blt.show();
        }
    },

    addBlockedUrl: function(url, lockCnt)
    {
        $('#block_list_table > table > tbody').append('<tr><td>'+ url +'</td><td>'+ lockCnt +'</td></tr>');
    },

    getTabInfo: function()
    {
        var me = this;
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            var tab = tabs[0];
            if (tab.id in me.objBgDS.tabs && me.objBgDS.tabs[tab.id].buCnt) {
                for (var url in me.objBgDS.tabs[tab.id].blockUrls)
                    me.addBlockedUrl(url, me.objBgDS.tabs[tab.id].blockUrls[url]);
                me.showBlockedUrlTable();
            }
        });
    },

    init: function(objBgDS)
    {
        this.objBgDS = objBgDS;
        this.setEvents();
        this.getTabInfo();
    }
};

/**
 * Init script
 */
$(document).ready(function(){
    chrome.runtime.getBackgroundPage(function(win) {
        objPopupDS.init(win.objDsBg);
    });
});
