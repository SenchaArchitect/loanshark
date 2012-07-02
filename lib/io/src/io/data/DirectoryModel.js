
Ext.require('Ext.cf.Overrides',function(){
    Ext.io_define("Ext.io.data.DirectoryModel", {
        extend: "Ext.data.Model",
        requires: ['Ext.data.identifier.Uuid'],
        config: { 
            identifier: 'uuid',
            fields: [
                { name:'name', type: 'string' },
                { name:'type', type: 'string' },
                { name:'meta', type: 'auto' }
            ],
            proxy: {
                id: 'ext-io-data-directory',
                type: 'localstorage'
            }
        }
    });
});
