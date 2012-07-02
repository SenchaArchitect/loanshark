/**
 * 
 * @private
 *
 * SyncStore
 *
 * It maintains...
 *
 *  - a Change Stamp to OID index
 *
 */
Ext.define('Ext.cf.data.SyncStore', {
    requires: [
        'Ext.cf.Utilities',
        'Ext.cf.ds.CSIV'
    ],
    

    /** 
     * Async initialize
     *
     * @param {Object} config
     * @param {Function} callback
     * @param {Object} scope
     *
     */
    asyncInitialize: function(config,callback,scope) {
        Ext.cf.Utilities.check('SyncStore', 'initialize', 'config', config, ['databaseName']);
        this.logger = Ext.cf.util.Logger;
        this.store= config.localStorageProxy || window.localStorage;
        this.id= config.databaseName;

// JCM check data version number

        var hasRecords= this.getIds().length>0;
        this.readConfig('databaseDefinition',function(data) {
            if(hasRecords && !data){
                this.logger.error('Ext.cf.data.SyncStore.initialize: Tried to use an existing store,',config.databaseName,', as a syncstore.');
                callback.call(scope,{r:'error'});
            }else{
                // ok
                this.readConfig('csiv',function(data) {
                    this.csiv= data ? Ext.create('Ext.cf.ds.CSIV').decode(data) : undefined;
                    if(!this.csiv){
                        this.reindex(function(){
                            callback.call(scope,{r:'ok'});
                        },this);
                    }else{
                        callback.call(scope,{r:'ok'});
                    }
                },this);
            }
        },this);
    },

    // crud

    /** 
     * Create
     *
     * @param {Array} records
     * @param {Function} callback
     * @param {Object} scope
     *
     */
    create: function(records, callback, scope) {
        var ids= this.getIds();
        records.forEach(function(record){
            ids.push(record.getOid());
            this.setRecord(record);
        },this);
        this.setIds(ids);
        if(callback){
            callback.call(scope);
        }
    },

    /** 
     * Read by Oid
     *
     * @param {Number/String} oid
     * @param {Function} callback
     * @param {Object} scope
     *
     */
    readByOid: function(oid, callback, scope) {
        var record= this.getRecord(oid);
        callback.call(scope,record);
    },

    /** 
     * Read by Oids
     *
     * @param {Array} oids
     * @param {Function} callback
     * @param {Object} scope
     *
     */
    readByOids: function(oids, callback, scope) {
        var records= [];
        var i, l= oids.length;
        var f= function(record){ records.push(record); };
        for(i=0;i<l;i++){
            this.readByOid(oids[i],f,this);
        }
        callback.call(scope,records);
    },

    /** 
     * Read by CSV
     *
     * @param {Object} csv
     * @param {Function} callback
     * @param {Object} scope
     *
     */
    readByCSV: function(csv, callback, scope) {
        //
        // Use the CS index to get a list of records that have changed since csv
        //
        var oids= this.csiv.oidsFrom(csv);
        this.readByOids(oids,callback,scope);
    },

    /** 
     * Read all
     *
     * @param {Function} callback
     * @param {Object} scope
     *
     */
    readAll: function(callback, scope){
        this.readByOids(this.getIds(),callback,scope);
    },

    /** 
     * Update
     *
     * @param {Array} records
     * @param {Function} callback
     * @param {Object} scope
     *
     */
    update: function(records, callback, scope) {
        records.forEach(function(record){
            this.setRecord(record);
        },this);
        if(callback){
            callback.call(scope);
        }
    },

    /** 
     * Destroy
     *
     * @param {Number/String} oid
     * @param {Function} callback
     * @param {Object} scope
     *
     */
    destroy: function(oid, callback, scope) {
        if(Ext.isArray(oid)){
            var ids= this.getIds();
            var i, l= oid.length;
            for(i=0;i<l;i++){
                var id= oid[i];
                Ext.Array.remove(ids, id);
                var key = this.getRecordKey(id);
                this.store.removeItem(key);
            }
            this.setIds(ids);
            if(callback){
                callback.call(scope);
            }
        }else{
            this.destroy([oid],callback,scope);
        }
    },

    /** 
     * Clear
     *
     * @param {Function} callback
     * @param {Object} scope
     *
     */
    clear: function(callback, scope) {
        var ids = this.getIds(), len = ids.length, i;
        for (i = 0; i < len; i++) {
            var key = this.getRecordKey(ids[i]);
            this.store.removeItem(key);
        }
        this.store.removeItem(this.id);
        this.store.removeItem(this.getRecordKey('csiv'));
        this.csiv= Ext.create('Ext.cf.ds.CSIV');
        callback.call(scope);
    },

    /** 
     * Set Model
     *
     * @param {Object} userModel
     *
     */
    setModel: function(userModel) {
        this.model= userModel;
    },

    // config

    /** 
     * Read config
     *
     * @param {Number/String} oid
     * @param {Function} callback
     * @param {Object} scope
     *
     */
    readConfig: function(oid, callback, scope) {
        var item= this.store.getItem(this.getRecordKey(oid));
        var data= item ? Ext.decode(item) : {};
        callback.call(scope,data);
    },
    
    /** 
     * Write config
     *
     * @param {Number/String} oid
     * @param {Object} data
     * @param {Function} callback
     * @param {Object} scope
     *
     */
    writeConfig: function(oid, data, callback, scope) {
        this.store.setItem(this.getRecordKey(oid),Ext.encode(data));
        callback.call(scope,data);
    },
    
    /** 
     * Remove config
     *
     * @param {Number/String} oid
     * @param {Function} callback
     * @param {Object} scope
     *
     */
    removeConfig: function(oid, callback, scope) {
        this.store.removeItem(this.getRecordKey(oid));
        callback.call(scope);
    },
    
    // cs to oid index
    
    /** 
     * Get CS Index
     *
     * @param {Function} callback
     * @param {Object} scope
     *
     */
    getCSIndex: function(callback,scope) {
        callback.call(scope,this.csiv);
    },

    /** 
     * Set CS Index
     *
     * @param {Object} csiv
     * @param {Function} callback
     * @param {Object} scope
     *
     */
    setCSIndex: function(csiv,callback,scope) {
        if(csiv){
            this.csiv= csiv;
            this.writeConfig('csiv',this.csiv.encode(),callback,scope);
        }else{
            callback.call(scope);
        }
    },

    // change replica number

    /** 
     * Change replica number
     *
     * @param {Number} old_replica_number
     * @param {Number} new_replica_number
     * @param {Function} callback
     * @param {Object} scope
     *
     */
    changeReplicaNumber: function(old_replica_number,new_replica_number,callback,scope) {
        this.readAll(function(records){
            var i, l= records.length;
            for(i=0;i<l;i++){
                var record= records[i];    
                var oid= record.getOid();
                if (record.changeReplicaNumber(old_replica_number,new_replica_number)) {
                    if(record.getOid()!=oid){
                        record.phantom= false;
                        this.create([record]);
                        this.destroy(oid);
                    }else{
                        this.update([record]);
                    }
                }
            }
            this.reindex(callback,scope);            
        },this);
    },

    // reindex

    /** 
     * Reindex
     *
     * @param {Function} callback
     * @param {Object} scope
     *
     */
    reindex: function(callback,scope){
        this.csiv= Ext.create('Ext.cf.ds.CSIV');
        this.readAll(function(records){
            var i, l= records.length;
            for(i=0;i<l;i++){
                var record= records[i];
                var oid= record.getOid();
                record.eco.forEachCS(function(cs){
                    this.csiv.add(cs,oid);
                },this);
            }
            callback.call(scope);
        },this);
    },  

    /** 
     * Get Id's
     *
     */
    getIds: function(){
        var ids= [];
        var item= this.store.getItem(this.id);
        if(item){
            ids= item.split(',');
        }
        //console.log('getIds',ids)
        return ids;
    },

    /** 
     * Set Id's
     *
     * @param {Array} ids
     *
     */
    setIds: function(ids) {
        //iPad bug requires that we remove the item before setting it
        this.store.removeItem(this.id);
        this.store.setItem(this.id, ids.join(','));
        //console.log('setIds',ids)
    },

    /** 
     * Get record key
     *
     * @param {Number/String} id
     *
     */
    getRecordKey: function(id) {
        return Ext.String.format("{0}-{1}", this.id, id);
    },

    /** 
     * Get record
     *
     * @param {Number/String} id
     *
     */
    getRecord: function(id) {
        var record;
        var key= this.getRecordKey(id);
        var item= this.store.getItem(key);
        if(item!==null){
            var x= Ext.decode(item);
            var raw = x.data;
            var data= {};
            var fields= this.model.getFields().items;
            var length= fields.length;
            var i = 0, field, name, obj;
            for (i = 0; i < length; i++) {
                field = fields[i];
                name  = field.getName();
                if (typeof field.getDecode() == 'function') {
                    data[name] = field.getDecode()(raw[name]);
                } else {
                    if (field.getType().type == 'date') {
                        data[name] = new Date(raw[name]);
                    } else {
                        data[name] = raw[name];
                    }
                }
            }
            record= new this.model(data);
            record.data._oid= raw._oid;
            if(raw._ref!==null && raw._ref!==undefined) { record.data._ref= raw._ref; }
            if(raw._ts!==null && raw._ts!==undefined) { record.data._ts= raw._ts; }
            record.eco= Ext.create('Ext.cf.ds.ECO',{oid:raw._oid,data:record.data,state:x.state});
            Ext.apply(record,Ext.cf.data.ModelWrapper);
            //console.log('get',key,item);
        }
        return record;
    },

    /** 
     * Set record
     *
     * @param {Object} record
     *
     */
    setRecord: function(record) {
        //console.log('set',Ext.encode(record))

        var raw = record.eco.data,
            data    = {},
            fields  = this.model.getFields().items,
            length  = fields.length,
            i = 0,
            field, name, obj, key;

        for (; i < length; i++) {
            field = fields[i];
            name  = field.getName();

            if (typeof field.getEncode() == 'function') {
                data[name] = field.getEncode()(rawData[name], record);
            } else {
                if (field.getType().type == 'date') {
                    data[name] = raw[name].getTime();
                } else {
                    data[name] = raw[name];
                }
            }
            if(data[name]===null || data[name]===undefined){
                data[name]= field.getDefaultValue();
            }
        }

        data._oid= record.getOid();
        if(raw._ref!==null && raw._ref!==undefined) { data._ref= raw._ref; }
        if(raw._ts!==null && raw._ts!==undefined) { data._ts= raw._ts; }

        //iPad bug requires that we remove the item before setting it
        var eco= record.eco;
        var oid= record.getOid();
        key = this.getRecordKey(oid);
        this.store.removeItem(key);
        var item= Ext.encode({data:data,state:eco.state});
        this.store.setItem(key,item);
        //console.log('set',key,item);
    }
    
});
