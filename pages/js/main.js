/**
 * Main settings object
 *
 * @var {object} chrome
 *
 * @author DiamondSystems <me@diamondsystems.org>
 */
var objSetDS = objSetDS || {

    storage: chrome.storage.sync,

    eventName_ETRBU: 'editTableRowBlockedUrls',

    objTable:              $('table'),
    objTableBlockedUrls:   $('#burls_table_urls > table:eq(0)'),
    objTableTabsUrls:      $('#tabs_table_urls > table:eq(0)'),
    objSelectBlockUrlTabs: $('.block-url-tabs-list'),

    setDB: function(objData)
    {
        this.storage.set(objData);
        chrome.runtime.sendMessage({optPage: "reload"});
    },

    getActiveMenuItem: function()
    {
        return $('.sidebar-sticky .nav-link.active').data("menu-item");
    },

    onEditTableRowBlockedUrls: function(blockUrlKeys)
    {
        this.objTableBlockedUrls.trigger(this.eventName_ETRBU, [blockUrlKeys]);
    },

    onAddSelectItemBlockUrlTabs: function(tabKey, tabUrl)
    {
        this.objSelectBlockUrlTabs.append('<option value="'+ tabKey +'">'+ tabUrl +'</option>');
    },

    onRemoveSelectItemBlockUrlTabs: function(tabKey)
    {
        this.objSelectBlockUrlTabs.find('option[value="'+ tabKey +'"]').remove();
    },

    updateBlockUrls: function(key)
    {
        var me = objSetDS;

        // Update table rows in the blocked urls page
        var rows    = me.objTableBlockedUrls.find('span[data-table-tab-key="'+ key +'"]'),
            rowsCnt = rows.length;
        if (rowsCnt) {
            objFunDS.getDb('urls', function (data, cnt) {
                if (!cnt)
                    return;
                var x1, tCnt;
                for (var k in data) {
                    if (data[k].type === 'all')
                        continue;
                    tCnt = data[k].tabs.length;
                    for (x1=0; x1 < tCnt; x1++) {
                        if (data[k].tabs[x1] === key) {
                            data[k].tabs.splice(x1, 1);
                            break;
                        }
                    }
                    if (! data[k].tabs.length)
                        data[k].type = 'all';
                }
                me.setDB({ urls:data });

                // Update table rows
                var arrKeys = [];
                for (x1=0; x1 < rowsCnt; x1++)
                    arrKeys.push( rows.eq(x1).parent().data('action-key') );
                me.onEditTableRowBlockedUrls(arrKeys);
            });
        }

        // Remove blocked url tab in the select
        me.onRemoveSelectItemBlockUrlTabs(key);
    },

    loadDomElements: function()
    {
        $('[data-toggle="popover"]').popover();  // popover
        $('[data-toggle="tooltip"]').tooltip();  // tooltip
        feather.replace();                       // feather

        // Select2
        $('[data-multiple="select2"]').select2();
        $('.select2-selection').addClass('custom-select');

        // show blocked urls container
        $('.content-'+this.getActiveMenuItem()).fadeIn(1000);

        // Version
        $('#ext_version').text(chrome.runtime.getManifest().version);
    },

    setEvents: function()
    {
        var me = objSetDS;

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

        // Global Search
        $('#global_search').on('input', function(){
            var val = $.trim($(this).val()).toLowerCase(),
                $tB = me.objTableBlockedUrls.find('tbody > tr'),
                $tT = me.objTableTabsUrls.find('tbody > tr');

            if (val) {
                $tB.hide();
                $tT.hide();
                $tB.each(function(i, el){
                    var $el = $(el);
                    if ($el.children('td:eq(1)').text().toLowerCase().indexOf(val) !== -1 ||
                        $el.children('td:eq(2)').text().toLowerCase().indexOf(val) !== -1 ||
                        $el.children('td:eq(3)').text().toLowerCase().indexOf(val) !== -1)
                    {
                        $el.show();
                    }
                });
                $tT.each(function(i, el){
                    var $el = $(el);
                    if ($el.children('td:eq(1)').text().toLowerCase().indexOf(val) !== -1 ||
                        $el.children('td:eq(2)').text().toLowerCase().indexOf(val) !== -1)
                    {
                        $el.show();
                    }
                });
            }
            else {
                $tB.show();
                $tT.show();
            }
        });

        // Remove Tab or Block URL
        var objModalDelUrl = $('#global_modal_removing_url');
        me.objTable.on('click', 'button[data-target="#global_modal_removing_url"]', function() {
            objModalDelUrl.find('span.remove-url').html(
                $(this).parent().parent().parent().children('td:eq(2)').html()
            );
            objModalDelUrl.find('button.action-remove')
                .data('remove-url-type', $(this).data('url-type'))
                .data('remove-url-key', $(this).parent().data('action-key'));
        });
        objModalDelUrl.find('button.action-remove').click(function() {
            var uType = $(this).data('remove-url-type'),
                uKey = $(this).data('remove-url-key');
            objFunDS.getDb(uType, function (data, cnt) {
                if (!cnt)
                    return;
                // Remove from DB
                delete data[uKey];
                var q = {};
                q[uType] = data;
                me.setDB(q);

                // Remove row table
                $('table div[data-action-key="'+ uKey +'"] > button[data-url-type="'+ uType +'"]').closest('tr').fadeOut(500, function() {
                    var objParent = $(this).parent(),
                        tCnt = objParent.children('tr').length - 1;
                    $(this).remove();
                    for (var x1=0; x1 < tCnt; x1++)
                        objParent.find('tr:eq('+ x1 +') > td:eq(0)').text(x1+1);
                });

                if (uType === 'tabs')
                    me.updateBlockUrls(uKey);
            });
        });
    },

    setEventsBlockedUrls: function()
    {
        var me = objSetDS;

        var objBU = {
            objUrl:            $('#burls_form_uri'),
            objUrlErr:         $('#burls_form_uri').next(),
            objUrlErrHelp:     $('#burls_form_help'),
            objCheckType:      $('#burls_form_check_type'),
            objTabs:           $('#burls_form_tabs'),
            objTabsLabel:      $('label[for="burls_form_tabs"]'),
            objTabsErr:        $('#burls_form_tabs_err'),
            objModal:          $('#burls_modal_edit_urls'),
            objModalCheckType: $('#burls_modal_edit_check_type'),
            objModalTabs:      $('#burls_modal_edit_tabs'),
            objModalTabsLabel: $('label[for="burls_modal_edit_tabs"]'),
            objModalTabsErr:   $('#burls_modal_edit_tabs_err'),
            objModalBtnSave:   $('#burls_modal_edit_btn_save'),

            objErrs: {
                url:       false,
                tabs:      false,
                modalTabs: false
            },
            isErrHide: true,

            tableSelector: '#burls_table_urls tbody',
            
            modalCheckTypeCache: '',
            modalTabsCache: [],

            errShow: function(section, txt)
            {
                if (this.objErrs[section])
                    return;
                this.objErrs[section] = true;
                this.isErrHide        = false;
                switch (section)
                {
                    case 'url':       this.objUrlErr.html(txt).stop().show(300);       break;
                    case 'tabs':      this.objTabsErr.html(txt).stop().show(300);      break;
                    case 'modalTabs': this.objModalTabsErr.html(txt).stop().show(300); break;
                }
            },

            errHide: function()
            {
                if (this.isErrHide)
                    return;
                this.isErrHide = true;
                for (var k in this.objErrs)
                    this.objErrs[k] = false;
                this.objUrlErr.html('').stop().hide(300);
                this.objTabsErr.html('').stop().hide(300);
                this.objModalTabsErr.html('').stop().hide(300);
            },

            getTableColumnTabs: function(key, type, tabs)
            {
                var strTabs = '';
                if (type !== 'all') {
                    var tabsCnt = tabs.length;
                    strTabs = '<div class="blocked-url-tabs" data-action-key="'+ key +'">';
                    for (var i=0; i<tabsCnt; i++)
                        strTabs += '<span data-table-tab-key="'+ tabs[i] +'" class="badge badge-info">'+ tabs[i] +'</span> ';
                    strTabs += '</div>';
                }
                else
                    strTabs = '<h6 class="p-0 m-0"><span class="badge badge-warning">&infin;</span></h6>';

                return strTabs;
            },

            getTableRow: function(key, url, type, tabs)
            {
                return [
                    this.getBlockTypeName(type),
                    url,
                    this.getTableColumnTabs(key, type, tabs),
                    '<div data-action-key="'+ key +'">' +
                        '<button type="button" data-toggle="modal" data-target="#burls_modal_viewing_urls" class="btn btn-primary btn-xs mr-2"><span data-feather="eye"></span></button>' +
                        '<button type="button" data-toggle="modal" data-target="#burls_modal_edit_urls" class="btn btn-info btn-xs mr-2"><span data-feather="edit"></span></button>' +
                        '<button type="button" data-toggle="modal" data-target="#global_modal_removing_url" data-url-type="urls" class="btn btn-danger btn-xs"><span data-feather="trash-2"></span></button> ' +
                        '</div>'
                ];
            },

            editTableRow: function(blockUrlKeys)
            {
                var meTab = this;

                objFunDS.getDb('urls', function (data, cnt) {
                    if (!cnt)
                        return;
                    var arrCnt = blockUrlKeys.length,
                        objTable, uData;
                    for (var i=0; i<arrCnt; i++) {
                        if (! (blockUrlKeys[i] in data))
                            continue;
                        uData    = data[blockUrlKeys[i]];
                        objTable = me.objTableBlockedUrls.find('div[data-action-key="'+ blockUrlKeys[i] +'"]:eq(0)').closest('tr');

                        objTable.children('td:eq(1)').html( meTab.getBlockTypeName(uData.type) );
                        objTable.children('td:eq(3)').html( meTab.getTableColumnTabs(blockUrlKeys[i], uData.type, uData.tabs) );
                    }
                });
            },

            getBlockTypeName: function(type)
            {
                switch (type)
                {
                    case 'all':  return('All');
                    case 'list': return('List');
                    case 'none': return('None');

                    default: return('---');
                }
            },

            getTabsTypeName: function(type)
            {
                switch (type)
                {
                    case 'all':  return('All tabs');
                    case 'list': return('Tabs list');
                    case 'none': return('Excluded tabs list');

                    default: return('Tabs');
                }
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

                objFunDS.getDb('urls', function(data, cnt) {
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
                    var nKey = objFunDS.keyGenerate(++uCnt);
                    data[nKey] = {
                        url: url,
                        type: type,
                        tabs: tabs
                    };
                    me.setDB({ urls: data });

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
        objFunDS.getDb('urls', function (data, cnt) {
            if (!cnt)
                return;
            var arrUrls = [];
            for (var k in data)
                arrUrls.push(objBU.getTableRow(k, data[k].url, data[k].type, data[k].tabs));
            me.addTableRows(objBU.tableSelector, arrUrls);
        });

        // Update tabs select data
        objFunDS.getDb('tabs', function(data, cnt) {
            if (!cnt)
                return;
            var s = '';
            for (var k in data)
                s += '<option value="'+ k +'">'+ data[k] +'</option>';
            me.objSelectBlockUrlTabs.append(s);
        });

        // Edit table row
        me.objTableBlockedUrls.on(me.eventName_ETRBU, function(e, blockUrlKeys) {
            objBU.editTableRow(blockUrlKeys);
        });

        // Change URL input
        objBU.objUrl.on('input', function() {
            objBU.onChangeForm();
        });

        // Change Check type select data
        objBU.objCheckType.change(function() {
            var valSel = $.trim($(this).val());
            if (valSel === 'all')
                objBU.objTabs.prop("disabled", true);
            else if (objBU.objTabs.prop("disabled"))
                objBU.objTabs.prop("disabled", false);
            objBU.objTabsLabel.text(objBU.getTabsTypeName(valSel));
            objBU.onChangeForm();
        });

        // Change Tabs select data
        objBU.objTabs.change(function() {
            objBU.onChangeForm();
        });

        // Click add block url
        $('#burls_form_btn_add_url').click(function() {
            var dataUri = objBU.parseUri();

            if (dataUri.url === '<all_urls>' || (dataUri.host === '*' && dataUri.protocol === '*' && ! dataUri.urn)) {
                objBU.errShow('url', 'Templates <span class="font-italic font-weight-bold">&lt;all_urls&gt;</span>' +
                    ' and <span class="font-italic font-weight-bold">*://*/</span>' +
                    ' can not be specified, as there will be no lockout sense. '+ objBU.objUrlErrHelp.html());
            }
            else if (! dataUri.url) {
                objBU.errShow('url', '<span class="font-italic font-weight-bold">URL</span> required.');
            }
            else if (! dataUri.host || ! dataUri.protocol) {
                objBU.errShow('url', 'Invalid url address template. See example '+ objBU.objUrlErrHelp.html());
                feather.replace();
            }
            else if (dataUri.type !== 'all' && ! dataUri.tabs.length) {
                objBU.errShow('tabs', 'Select at least one tab.');
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

        // Click viewing url data
        me.objTable.on('click', 'button[data-target="#burls_modal_viewing_urls"]', function() {
            var uKey = $(this).parent().data('action-key');

            objFunDS.getDb(['urls', 'tabs'], function(res) {
                if (typeof res.urls !== "object" || typeof res.tabs !== "object"
                    || ! Object.keys(res.urls).length || ! (uKey in res.urls)) {
                    return;
                }
                var objModalViewUrl = $('#burls_modal_viewing_urls'),
                    objTabsUrl      = objModalViewUrl.find('h5.tabs-url-all'),
                    urlData         = res.urls[uKey];

                // set data
                objModalViewUrl.find('span.blocked-url').html(urlData.url);
                objModalViewUrl.find('span.url-type').html(objBU.getBlockTypeName(urlData.type));
                objModalViewUrl.find('legend.tab-url-title').html(objBU.getTabsTypeName(urlData.type));

                // set tabs
                if (urlData.type !== 'all') {
                    objTabsUrl.hide().next().show();
                    var tabsCnt = urlData.tabs.length,
                        arrUrls = [],
                        tabKey;
                    if (tabsCnt) {
                        for (var i=0; i<tabsCnt; i++) {
                            tabKey = urlData.tabs[i];
                            if (tabKey in res.tabs) {
                                arrUrls.push([
                                    tabKey,
                                    res.tabs[tabKey]
                                ]);
                            }
                        }
                        if (arrUrls.length) {
                            var sel = '#burls_modal_viewing_urls table.tabs-url-table tbody';
                            $(sel).html('');
                            me.addTableRows(sel, arrUrls);
                        }
                    }
                }
                else
                    objTabsUrl.show().next().hide();
            });
        });

        // Click edit url data
        me.objTable.on('click', 'button[data-target="#burls_modal_edit_urls"]', function() {
            var uKey = $(this).parent().data('action-key');

            objBU.errHide();

            objBU.modalCheckTypeCache = objBU.objModalCheckType.val();
            objBU.modalTabsCache      = objBU.objModalTabs.val();

            objFunDS.getDb('urls', function(data, cnt) {
                if (!cnt || ! (uKey in data))
                    return;
                var urlData = data[uKey];

                // set data
                objBU.objModalBtnSave.data('edit-url-key', uKey);
                objBU.objModal.find('span.blocked-url').html(urlData.url);
                objBU.objModal.find('select#burls_modal_edit_check_type > option[value="'+ urlData.type +'"]').prop('selected', true);
                objBU.objModalTabsLabel.text(objBU.getTabsTypeName(urlData.type));
                objBU.objModalTabs.prop('disabled', false).find('option:selected').prop('selected', false).change();

                // set tabs
                if (urlData.type !== 'all') {
                    var tabsCnt = urlData.tabs.length;
                    if (tabsCnt) {
                        for (var i=0; i<tabsCnt; i++)
                            objBU.objModalTabs.find('option[value="'+ urlData.tabs[i] +'"]').prop('selected', true);
                        objBU.objModalTabs.change();
                    }
                }
                else
                    objBU.objModalTabs.prop('disabled', true);
            });
        });

        // Change check type URL in the modal
        objBU.objModalCheckType.change(function() {
            var chType = $(this).val();

            objBU.errHide();

            if (chType === 'all') {
                objBU.modalTabsCache = objBU.objModalTabs.val();
                objBU.objModalTabs.prop('disabled', true).find('option:selected').prop('selected', false).change();
            }
            else {
                objBU.objModalTabs.prop('disabled', false);
                var cacheTabsCnt = objBU.modalTabsCache.length;
                if (objBU.modalCheckTypeCache === 'all' && ! objBU.objModalTabs.val().length && cacheTabsCnt) {
                    for (var i=0; i<cacheTabsCnt; i++)
                        objBU.objModalTabs.find('option[value="'+ objBU.modalTabsCache[i] +'"]').prop('selected', true);
                    objBU.objModalTabs.change();
                }
            }
            objBU.modalCheckTypeCache = chType;
            objBU.objModalTabsLabel.text(objBU.getTabsTypeName(chType));
        });

        // Change check type URL in the modal
        objBU.objModalTabs.change(function() {
            objBU.errHide();
        });

        // Save change url data
        objBU.objModalBtnSave.click(function() {
            var chType = objBU.objModalCheckType.val(),
                tabs   = objBU.objModalTabs.val(),
                uKey   = $(this).data('edit-url-key');

            // Check data
            if (chType !== 'all' && ! tabs.length)
                objBU.errShow('modalTabs', 'Select at least one tab.');
            else {
                objFunDS.getDb('urls', function(data, cnt) {
                    if (!cnt || ! (uKey in data))
                        return;
                    data[uKey].tabs = (chType === 'all') ? [] : tabs;
                    data[uKey].type = chType;

                    // update urls
                    me.setDB({ urls:data });

                    // edit table row
                    objBU.editTableRow([uKey]);

                    // Close modal
                    objBU.objModal.modal('hide');
                });
            }
        });
    },

    setEventsTabs: function()
    {
        var me = objSetDS;

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
                    '<div data-action-key="'+ key +'">' +
                        '<button type="button" data-toggle="modal" data-target="#global_modal_removing_url" data-url-type="tabs" class="btn btn-danger btn-xs"><span data-feather="trash-2"></span></button>' +
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

                objFunDS.getDb('tabs', function (data, cnt) {
                    // check tabs list
                    var uCnt = 0,
                        mIndex;
                    if (cnt) {
                        for (var kt in data) {
                            if (data[kt] === url) {
                                me.showAlert('#tabs_alert_add_url_error');
                                meTab.objHost.focus();
                                return;
                            }
                            if ((mIndex = kt.match(/^([0-9]+)_/)) && (mIndex = parseInt(mIndex[1])) > uCnt)
                                uCnt = mIndex;
                        }
                    }

                    // save tab urls
                    var nKey = objFunDS.keyGenerate(++uCnt);
                    data[nKey] = url;
                    me.setDB({ tabs: data });

                    // add url in table
                    meTab.clearForm();
                    me.addTableRows(meTab.tableSelector, [meTab.getTableRow(nKey, url)]);

                    // add url and key tab in the selects
                    me.onAddSelectItemBlockUrlTabs(nKey, url);

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
        objFunDS.getDb('tabs', function (data, cnt) {
            if (! cnt)
                return;
            var arrUrls = [];
            for (var kt in data)
                arrUrls.push(objTabs.getTableRow(kt, data[kt]));
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
        this.loadDomElements();
        this.setEvents();
        this.setEventsBlockedUrls();
        this.setEventsTabs();
    }
};

/**
 * Init script
 */
$(document).ready(function(){
    objSetDS.init();
});
