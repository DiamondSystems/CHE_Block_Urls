/**
 * Main settings object
 *
 * @var {object} chrome
 *
 * @author DiamondSystems <me@diamondsystems.org>
 */
var objSetDS = objSetDS || {

    storage: chrome.storage.sync,

    keyGenerate: function(index, count)
    {
        var res    = '',
            pos    = 0,
            w      = '0123456789qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM',
            maxPos = w.length - 1;

        count = (count) ? count : (index?4:6);
        for (var i = 0; i < count; ++i) {
            pos = Math.floor(Math.random() * maxPos);
            res += w.substring(pos, pos + 1);
        }
        return ((index?index+'_':'')+res);
    },

    getActiveMenuItem: function()
    {
        return $('.sidebar-sticky .nav-link.active').data("menu-item");
    },

    setEvents: function()
    {
        // Click left menu bar
        $('.sidebar-sticky .nav-link').click(function(){
            var $this = $(this);

            $('.sidebar-sticky .nav-link.active').removeClass('active');
            $this.addClass('active');

            $('.content-block').stop(true).hide();
            $('.content-'+$this.data("menu-item")).fadeIn(600);

            return(false);
        });

        // Click add forms btn
        $('.content-block button.btn-add-form').click(function() {
            var $this = $(this),
                objForm = $this.closest('.content-block').find('.add-form');
            if ($this.hasClass('active')) {
                objForm.stop().slideUp(300);
                $this.removeClass('active');
            }
            else {
                objForm.stop().slideDown(300);
                $this.addClass('active');
            }
        });
    },

    setEventsTabs: function()
    {
        var me = this;

        var objTabs = {
            errHostIsShow: false,

            objProtocol: $('#tabs_form_protocols'),
            objHost:     $('#tabs_form_uri'),
            objHostErr:  $('#tabs_form_uri').next(),
            objUrn:      $('#tabs_form_urn'),
            objUrnAll:   $('#tabs_form_all_urn'),

            tableSelector: '#tabs_table_urls tbody',

            errHost: function(isShow, txt)
            {
                if (isShow) {
                    if (!this.errHostIsShow) {
                        this.errHostIsShow = true;
                        this.objHostErr.html(txt).stop().show(300);
                    }
                }
                else {
                    if (this.errHostIsShow) {
                        this.errHostIsShow = false;
                        this.objHostErr.html('').stop().hide(300);
                    }
                }
            },

            parseUri: function()
            {
                var valHost = $.trim(this.objHost.val()),
                    res = {
                        protocol: '',
                        host:     '',
                        urn:      '',
                        urnAll:   ''
                    };

                if (!valHost || valHost.match(/:\/\/$/))
                    return res;

                var mHost = valHost.match(/^(([\w]+):\/\/)?(.+?)(\/(.*?)(\*)?)?$/),
                    sUrn1 = ((mHost[5] !== undefined) ? mHost[5] : ''),
                    sUrn2 = $.trim(this.objUrn.val()).replace(/^\*$/, '');

                res.protocol = ((mHost[2] !== undefined) ? mHost[2] : $.trim(this.objProtocol.val()));
                res.host     = mHost[3];
                res.urn      = ((sUrn1 && sUrn2) ? (sUrn1.replace(/\/+$/, '') +'/'+ sUrn2.replace(/^\/+/, '')) : (sUrn1 ? sUrn1 : sUrn2)).replace(/^\/+/, '');
                res.urnAll   = ((mHost[6] !== undefined) ? mHost[6] : (this.objUrnAll.prop('checked') ? '*' : ''));

                return res;
            },

            getTableRow: function(key, url)
            {
                return [
                    key,
                    url,
                    '<div class="tabs-table-action" data-tab-url-key="'+ key +'">' +
                        '<button type="button" class="action-trash btn btn-danger btn-xs"><span data-feather="trash-2"></span></button>' +
                        '</div>'
                ];
            },

            saveUrl: function(url)
            {
                var meTab = this;

                me.storage.get(['tabs'], function (res) {
                    // check tabs list
                    var uCnt = 0,
                        mIndex;
                    if (typeof res.tabs === "object") {
                        for (var kt in res.tabs) {
                            if (res.tabs[kt] === url) {
                                me.showAlert('#tabs_alert_add_url_error');
                                meTab.objHost.focus();
                                return;
                            }
                            if ((mIndex = kt.match(/^([0-9]+)_/)) && (mIndex = parseInt(mIndex[1])) > uCnt)
                                uCnt = mIndex;
                        }
                    }

                    // save tab urls
                    var nKey = me.keyGenerate(++uCnt);
                    res.tabs[nKey] = url;
                    me.storage.set({ tabs: res.tabs });

                    // clear form
                    meTab.objProtocol.find('option[value="http"]').prop('selected', true);
                    meTab.objHost.val('');
                    meTab.objUrn.val('');
                    meTab.objUrnAll.prop('checked', false);

                    // add url in table
                    me.addTableRows(meTab.tableSelector, [meTab.getTableRow(nKey, url)]);

                    // show successful message
                    me.showAlert('#tabs_alert_add_url_success');
                });
            }
        };

        // Fill in the table
        me.storage.get(['tabs'], function (res) {
            if (typeof res.tabs !== "object" || ! Object.keys(res.tabs).length)
                return;
            var arrUrls = [];
            for (var kt in res.tabs)
                arrUrls.push(objTabs.getTableRow(kt, res.tabs[kt]));
            me.addTableRows(objTabs.tableSelector, arrUrls);
        });

        // Change host input
        objTabs.objHost.on('input', function() {
            objTabs.errHost(false);
        });

        // Click add tab url
        $('#tabs_form_btn_add_url').click(function() {
            var dataUri = objTabs.parseUri();

            if (! dataUri.host) {
                objTabs.errHost(true, '<span class="font-italic font-weight-bold">Host</span> or' +
                    '<span class="font-italic font-weight-bold">Domain</span> or' +
                    '<span class="font-italic font-weight-bold">URL</span> or' +
                    '<span class="font-italic font-weight-bold">URI</span> required.'
                );
            }
            else if (! dataUri.protocol.match(/^(https?)$/)) {
                objTabs.errHost(true, 'Not a valid protocol. Supports only ' +
                    '<span class="font-italic font-weight-bold">http</span> or ' +
                    '<span class="font-italic font-weight-bold">https</span>.'
                );
            }
            else {
                objTabs.saveUrl(dataUri.protocol+ '://'+ dataUri.host +'/'+ dataUri.urn + dataUri.urnAll);
                return;
            }
            objTabs.objHost.focus();
        });

        // Click remove tab url
        $('#tabs_table_urls').on('click', '.tabs-table-action .action-trash', function() {
            var uKey = $(this).parent().data('tab-url-key');
            me.storage.get(['tabs'], function (res) {
                if (typeof res.tabs !== "object" || ! Object.keys(res.tabs).length)
                    return;
                delete res.tabs[uKey];
                me.storage.set({ tabs: res.tabs });
            });
            me.removeTableRow(this);
        });
    },

    addTableRows: function(tableSelector, rows)
    {
        var objTable  = $(tableSelector),
            tblCnt    = objTable.children('tr').length,
            rowCnt    = rows.length,
            colCnt    = 0,
            row       = '',
            isAnimate = (rowCnt === 1),
            sDisplay  = ((rowCnt === 1) ? 'style="display: none"' : '');

        if (! rowCnt)
            return;

        var x1,x2;
        for (x1=0; x1 < rowCnt; x1++)
        {
            row = '<tr '+ sDisplay +'>';
            colCnt = rows[x1].length;
            row += '<td>'+ (++tblCnt) +'</td>';
            for (x2=0; x2 < colCnt; x2++)
                row += '<td>'+ rows[x1][x2] +'</td>';
            row += '</tr>';

            objTable.append(row);
            if (isAnimate)
                objTable.find('tr:eq(-1)').fadeIn(500);
        }
        feather.replace();
    },

    removeTableRow: function(removeBtnSelector)
    {
        $(removeBtnSelector).closest('tr').fadeOut(500, function() {
            var objParent = $(this).parent(),
                tCnt = objParent.children('tr').length - 1;
            $(this).remove();
            for (var x1=0; x1 < tCnt; x1++)
                objParent.find('tr:eq('+ x1 +') > td:eq(0)').text(x1+1);
        });
    },

    showAlert: function(selector)
    {
        var objAlertSuccess = $(selector);
        objAlertSuccess.stop(true).show(300);
        setTimeout(function() {
            objAlertSuccess.fadeOut(3000);
        }, 1000);
    },

    init: function()
    {
        this.setEvents();
        this.setEventsTabs();

        // show blocked urls container
        $('.content-'+this.getActiveMenuItem()).fadeIn(1000);
    }
};

/**
 * Init script
 */
$(document).ready(function(){
    $('[data-toggle="popover"]').popover();
    $('[data-toggle="tooltip"]').tooltip();
    objSetDS.init();
});

/**
 * Replace feather lib
 */
feather.replace();
