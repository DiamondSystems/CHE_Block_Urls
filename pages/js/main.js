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

    getDb: function(table, fun)
    {
        if (Array.isArray(table)) {
            this.storage.get(table, function (res) {
                fun(res);
            });
        }
        else {
            this.storage.get([table], function (res) {
                if (typeof res[table] === "object")
                    fun(res[table], Object.keys(res[table]).length);
                else if (Array.isArray(res[table]))
                    fun(res[table], res[table].length);
                else if (res[table])
                    fun(res[table],0);
                else
                    fun({},0);
            });
        }
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
        $('.content-block button.btn-show-form').click(function() {
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

    setEventsBlockedUrls: function()
    {
        var me = this;

        var objBU = {
            errUrlIsShow:  false,
            errTabsIsShow: false,

            objUrl:        $('#burls_form_uri'),
            objUrlErr:     $('#burls_form_uri').next(),
            objUrlErrHelp: $('#burls_form_help'),
            objCheckType:  $('#burls_form_check_type'),
            objTabs:       $('#burls_form_tabs'),
            objTabsLabel:  $('#burls_form_tabs').parent().children('label[for="burls_form_tabs"]'),
            objTabsErr:    $('#burls_form_tabs').parent().children('.invalid-feedback'),

            tableSelector: '#burls_table_urls tbody',

            errUrl: function(txt)
            {
                if (!this.errUrlIsShow) {
                    this.errUrlIsShow = true;
                    this.objUrlErr.html(txt).stop().show(300);
                }
            },

            errTabs: function(txt)
            {
                if (!this.errTabsIsShow) {
                    this.errTabsIsShow = true;
                    this.objTabsErr.html(txt).stop().show(300);
                }
            },

            errHide: function()
            {
                if (this.errUrlIsShow || this.errTabsIsShow) {
                    this.errUrlIsShow = false;
                    this.errTabsIsShow = false;
                    this.objUrlErr.html('').stop().hide(300);
                    this.objTabsErr.html('').stop().hide(300);
                }
            },

            getTableRow: function(key, url, type, tabs)
            {
                var typeName,
                    strTabs = '',
                    tabsCnt = tabs.length;

                switch (type)
                {
                    case 'all':  typeName = 'All';
                        tabsCnt = 0;
                        strTabs = '&infin;';
                        break;
                    case 'list': typeName = 'List'; break;
                    case 'none': typeName = 'None'; break;

                    default: typeName = '---';
                }

                for (var i=0; i<tabsCnt; i++)
                    strTabs += '<span class="badge badge-info">'+ tabs[i] +'</span> ';

                return [
                    typeName,
                    url,
                    strTabs,
                    '<div class="burl-table-action" data-burl-key="'+ key +'">' +
                    '<button type="button" class="action-trash btn btn-danger btn-xs"><span data-feather="trash-2"></span></button>' +
                    '</div>'
                ];
            },

            clearForm: function()
            {
                this.objUrl.val('');
                this.objCheckType.find('option[value="all"]').prop('selected', true);
                this.objTabs.find('option:selected').prop('selected', false).change();
                this.objTabs.prop("disabled", true);
                this.objTabsLabel.text('All tabs');
                this.errHide();
            },

            parseUri: function()
            {
                var res = {
                        url:      $.trim(this.objUrl.val()),
                        protocol: '',
                        host:     '',
                        urn:      '',
                        type:     $.trim(this.objCheckType.val()),
                        tabs:     this.objTabs.val()
                    },
                    mUrl;

                if (! Array.isArray(res.tabs) || res.type === 'all')
                    res.tabs = [];

                if (mUrl=res.url.match(/^([\w]+|\*):\/\/(.+?)\/(.*?)$/))
                {
                    res.protocol = mUrl[1];
                    res.host     = mUrl[2];
                    res.urn      = mUrl[3];
                }
                return res;
            },

            saveUrl: function(url, type, tabs)
            {
                var meTab = this;

                me.getDb('urls', function(data, cnt) {
                    // check tabs list
                    var uCnt = 0,
                        mIndex;
                    for (var k in data) {
                        if (data[k].url === url) {
                            me.showAlert('#burls_alert_add_url_error');
                            meTab.objUrl.focus();
                            return;
                        }
                        if ((mIndex = k.match(/^([0-9]+)_/)) && (mIndex = parseInt(mIndex[1])) > uCnt)
                            uCnt = mIndex;
                    }

                    // save tab urls
                    var nKey = me.keyGenerate(++uCnt);
                    data[nKey] = {
                        url: url,
                        type: type,
                        tabs: tabs
                    };
                    me.storage.set({ urls: data });

                    // add url in table
                    meTab.clearForm();
                    me.addTableRows(meTab.tableSelector, [meTab.getTableRow(nKey, url, type, tabs)]);

                    // show successful message
                    me.showAlert('#burls_alert_add_url_success');
                });
            },

            onChangeForm: function()
            {
                this.errHide();
            }
        };

        // Fill in the table
        this.getDb('urls', function (data, cnt) {
            if (!cnt)
                return;
            var arrUrls = [];
            for (var k in data)
                arrUrls.push(objBU.getTableRow(k, data[k].url, data[k].type, data[k].tabs));
            me.addTableRows(objBU.tableSelector, arrUrls);
        });

        // Update tabs select data
        this.getDb('tabs', function(data, cnt) {
            if (!cnt)
                return;
            var s = '';
            for (var k in data)
                s += '<option value="'+ k +'">'+ data[k] +'</option>';
            objBU.objTabs.append(s);
        });

        // Change URL input
        objBU.objUrl.on('input', function() {
            objBU.onChangeForm();
        });

        // Change Check type checkbox
        objBU.objCheckType.change(function() {
            var valSel = $.trim($(this).val());
            if (valSel === 'all') {
                objBU.objTabs.prop("disabled", true);
                objBU.objTabsLabel.text('All tabs');
            }
            else {
                if (objBU.objTabs.prop("disabled"))
                    objBU.objTabs.prop("disabled", false);

                if (valSel === 'list')
                    objBU.objTabsLabel.text('Tabs list');
                else
                    objBU.objTabsLabel.text('Excluded tabs list');
            }
            objBU.onChangeForm();
        });

        // Change Tabs checkbox
        objBU.objTabs.change(function() {
            objBU.onChangeForm();
        });

        // Click add block url
        $('#burls_form_btn_add_url').click(function() {
            var dataUri = objBU.parseUri();

            if (dataUri.url === '<all_urls>' || (dataUri.host === '*' && dataUri.protocol === '*' && ! dataUri.urn)) {
                objBU.errUrl('Templates <span class="font-italic font-weight-bold">&lt;all_urls&gt;</span>' +
                    ' and <span class="font-italic font-weight-bold">*://*/</span>' +
                    ' can not be specified, as there will be no lockout sense. '+ objBU.objUrlErrHelp.html());
            }
            else if (! dataUri.url) {
                objBU.errUrl('<span class="font-italic font-weight-bold">URL</span> required.');
            }
            else if (! dataUri.host || ! dataUri.protocol) {
                objBU.errUrl('Invalid url address template. See example '+ objBU.objUrlErrHelp.html());
                feather.replace();
            }
            else if (dataUri.type !== 'all' && ! dataUri.tabs.length) {
                objBU.errTabs('Select at least one tab.');
            }
            else {
                objBU.saveUrl(dataUri.protocol+ '://'+ dataUri.host +'/'+ dataUri.urn, dataUri.type, dataUri.tabs);
                return;
            }
            objBU.objUrl.focus();
        });

        // Click clear url from the form
        $('#burls_form_btn_clear_url').click(function() {
            objBU.clearForm();
        });

        // Click remove tab url
        $('#burls_table_urls').on('click', '.burl-table-action .action-trash', function() {
            var uKey = $(this).parent().data('burl-key');
            me.getDb('urls', function (data, cnt) {
                if (!cnt)
                    return;
                delete data[uKey];
                me.storage.set({ urls: data });
            });
            me.removeTableRow(this);
        });
    },

    setEventsTabs: function()
    {
        var me = this;

        var objTabs = {
            errHostIsShow: false,

            objProtocol:   $('#tabs_form_protocols'),
            objHost:       $('#tabs_form_uri'),
            objHostErr:    $('#tabs_form_uri').next(),
            objUrn:        $('#tabs_form_urn'),
            objUrnAll:     $('#tabs_form_all_urn'),
            objViewing:    $('#tabs_form_viewing_uri'),
            objViewingTxt: $('#tabs_form_viewing_uri > span:eq(1)'),

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
                        protocol: $.trim(this.objProtocol.val()),
                        host:     '',
                        urn:      $.trim(this.objUrn.val()).replace(/^\*$/, ''),
                        urnAll:   (this.objUrnAll.prop('checked') ? '*' : '')
                    };

                if (valHost && !valHost.match(/:\/\/$/))
                {
                    var mHost = valHost.match(/^(([\w]+):\/\/)?(.+?)(\/(.*?)(\*)?)?$/),
                        sUrn  = ((mHost[5] !== undefined) ? mHost[5] : '');

                    if (mHost[2] !== undefined)
                        res.protocol = mHost[2];
                    if (mHost[6] !== undefined)
                        res.urnAll = mHost[6];

                    res.host = mHost[3];
                    res.urn  = ((sUrn && res.urn) ? (sUrn.replace(/\/+$/, '') +'/'+ res.urn.replace(/^\/+/, '')) : (sUrn ? sUrn : res.urn)).replace(/^\/+/, '');
                }
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

            clearForm: function()
            {
                this.objProtocol.find('option[value="http"]').prop('selected', true);
                this.objHost.val('');
                this.objUrn.val('');
                this.objUrnAll.prop('checked', false);

                this.onChangeForm();
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

                    // add url in table
                    meTab.clearForm();
                    me.addTableRows(meTab.tableSelector, [meTab.getTableRow(nKey, url)]);

                    // show successful message
                    me.showAlert('#tabs_alert_add_url_success');
                });
            },

            onChangeForm: function()
            {
                this.errHost(false);
                var dataUri = this.parseUri(),
                    isErr   = (! dataUri.host || ! dataUri.protocol.match(/^(https?)$/)),
                    sUri    = dataUri.protocol+ '://'+ (dataUri.host || '???') +'/'+ dataUri.urn + dataUri.urnAll;

                this.objViewingTxt.text(sUri);
                if (isErr) {
                    if (! this.objViewing.hasClass('alert-warning'))
                        this.objViewing.removeClass('alert-success').addClass('alert-warning');
                }
                else {
                    if (! this.objViewing.hasClass('alert-success'))
                        this.objViewing.removeClass('alert-warning').addClass('alert-success');
                }
            }
        };

        // Fill in the table
        this.storage.get(['tabs'], function (res) {
            if (typeof res.tabs !== "object" || ! Object.keys(res.tabs).length)
                return;
            var arrUrls = [];
            for (var kt in res.tabs)
                arrUrls.push(objTabs.getTableRow(kt, res.tabs[kt]));
            me.addTableRows(objTabs.tableSelector, arrUrls);
        });

        // Change protocol select
        objTabs.objProtocol.change(function() {
            objTabs.onChangeForm();
        });

        // Change host input
        objTabs.objHost.on('input', function() {
            objTabs.onChangeForm();
        });

        // Change URN input
        objTabs.objUrn.on('input', function() {
            objTabs.onChangeForm();
        });

        // Change All URN checkbox
        objTabs.objUrnAll.change(function() {
            objTabs.onChangeForm();
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

        // Click clear url from the form
        $('#tabs_form_btn_clear_url').click(function() {
            objTabs.clearForm();
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
        this.setEventsBlockedUrls();
        this.setEventsTabs();

        // Corrected style select2 input
        $('.select2-selection').addClass('custom-select');

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
    $('[data-multiple="select2"]').select2();
    feather.replace();
    objSetDS.init();
});
