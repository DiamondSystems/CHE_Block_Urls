/**
 * Main functions object
 * @var {object} chrome
 * @author DiamondSystems <me@diamondsystems.org>
 */
var objFunDS = objFunDS || {

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
    }
};