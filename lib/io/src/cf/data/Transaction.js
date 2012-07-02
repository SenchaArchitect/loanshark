/**
 * 
 * @private
 *
 * Transaction
 *
 * A Transaction wraps an implementation of the proxy, 
 * providing for caching of reads, and group commit of writes.
 */ 
Ext.define('Ext.cf.data.Transaction', { 
    requires: [
        'Ext.cf.ds.LogicalClock',
        'Ext.cf.ds.CSV',
        'Ext.cf.util.Logger'
    ],

    /** 
     * Constructor
     *
     * @param {Object} proxy
     * @param {Function} callback
     * @param {Object} scope
     *
     */
    constructor: function(proxy,callback,scope) {
        this.proxy= proxy;
        this.store= proxy.getStore();
        this.generatorChanged= false;
        this.originalGenerator= proxy.generator;
        this.modifiedGenerator= Ext.create('Ext.cf.ds.LogicalClock',proxy.generator);
        this.csvChanged= false;
        this.originalCSV= proxy.csv;
        this.modifiedCSV= Ext.create('Ext.cf.ds.CSV',proxy.csv); // copy the csv
        this.cache= {}; // read cache of records
        this.toCreate= []; // records to create
        this.toUpdate= []; // records to update
        this.toDestroy= []; // records to destroy
        this.store.getCSIndex(function(csiv){
            this.csivChanged= false;
            this.csiv= csiv;
            callback.call(scope,this);
        },this);
    },
    
    /** 
     * Generate change stamp
     *
     * return {Ext.cf.ds.CS}
     *
     */
    generateChangeStamp: function() {
        var cs= this.modifiedGenerator.generateChangeStamp();
        this.modifiedCSV.addCS(cs);
        this.generatorChanged= true;
        this.csvChanged= true;
        return cs;
    },

    /** 
     * Create
     *
     * @param {Array} records
     *
     */
    create: function(records) {
        this.addToCache(records);
        this.addToList(this.toCreate,records);
     },

    /** 
     * Read by oid
     *
     * @param {Number/String} oid
     * @param {Function} callback
     * @param {Object} scope
     *
     */
    readByOid: function(oid, callback, scope) {
        var record= this.cache[oid];
    	//console.log('readByOid',oid,'=>',record)
        if(record){
            callback.call(scope,record);
        }else{
            this.store.readByOid(oid,function(record){
                if(record){
                    this.addToCache(record);
                }
                callback.call(scope,record);
            },this);
        }
    },

    /** 
     * Read cache by oid
     *
     * @param {String} oid
     * @param {Function} callback
     * @param {Object} scope
     *
     */
    readCacheByOid: function(oid, callback, scope) {
        var record= this.cache[oid];
        callback.call(scope,record);
    },

    /** 
     * Read by oids
     *
     * @param {Array} oids
     * @param {Function} callback
     * @param {Object} scope
     *
     */
    readByOids: function(oids, callback, scope) {
    	//console.log('readByOids',oids)
        var records= [];
        var readOids= [];
        var i, l= oids.length;
        for(i=0;i<l;i++){
            var oid= oids[i];
            var record= this.cache[oid];
            if(record){
                records.push(record);
            }else{
                readOids.push(oid);
            }
        }
        this.store.readByOids(readOids,function(records2){
            this.addToCache(records2);
            records= records.concat(records2);
            callback.call(scope,records);
        },this);
    },

    /** 
     * Update
     *
     * @param {Array} records
     *
     */
    update: function(records) {
        this.addToCache(records);
        this.addToList(this.toUpdate,records);
    },

    /** 
     * Destroy
     *
     * @param {String} oid
     *
     */
    destroy: function(oid) {
        this.toDestroy.push(oid);
    },

    /** 
     * Update CS
     *
     * @param {Ext.cf.ds.CS} from
     * @param {Ext.cf.ds.CS} to
     * @param {String} oid
     *
     */
    updateCS: function(from,to,oid) {
        if(from && to){
            if(!from.equals(to)){
                this.csvChanged= this.modifiedCSV.addX(to) || this.csvChanged;
                this.csivChanged= true;
                //this.csiv.remove(from,oid);
                this.csiv.add(to,oid);
            }
        }else if(from){
            //this.csivChanged= true;
            //this.csiv.remove(from,oid);
        }else if(to){
            this.csvChanged= this.modifiedCSV.addX(to) || this.csvChanged;
            this.csivChanged= true;
            this.csiv.add(to,oid);
        }
    },
    
    /** 
     * Update CSV
     *
     * @param {Ext.cf.ds.CSV} csv
     *
     */
    updateCSV: function(csv) {
        this.csvChanged= this.modifiedCSV.addX(csv) || this.csvChanged;
    },
    
    /** 
     * Update Replica numbers
     *
     * @param {Ext.cf.ds.CSV} csv
     *
     */
    updateReplicaNumbers: function(csv) {
        this.csvChanged= this.modifiedCSV.addReplicaNumbers(csv) || this.csvChanged;
    },
    
    /** 
     * Update generator
     *
     * @param {Ext.cf.ds.CSV} csv
     *
     */
    updateGenerator: function(csv) {
        this.generatorChanged= this.originalGenerator.seenCSV(csv);
    },
    
    /** 
     * Commit
     *
     * @param {Function} callback
     * @param {Object} scope
     *
     */
    commit: function(callback, scope) {
        //
        // Work out which records are to be created or updated.
        //
        this.toCreate= Ext.Array.unique(this.toCreate);
        this.toUpdate= Ext.Array.unique(this.toUpdate);
        this.toUpdate= Ext.Array.difference(this.toUpdate,this.toCreate);
        var createRecords= this.getRecordsForList(this.toCreate);
        var updateRecords= this.getRecordsForList(this.toUpdate);
        this.store.create(createRecords,function(){
            this.store.update(updateRecords,function(){
                this.store.destroy(this.toDestroy,function(){
                    this.store.setCSIndex(this.csivChanged ? this.csiv : undefined,function(){
                        this.writeConfig_CSV(function(){
                            this.writeConfig_Generator(function(){
                                callback.call(scope,createRecords,updateRecords);
                            },this);
                        },this);
                    },this);
                },this);
            },this);
        },this);
    },
    
    /** 
     * Write config generator
     *
     * @param {Function} callback
     * @param {Object} scope
     *
     * @private
     *
     */
    writeConfig_Generator: function(callback,scope){
        if(this.generatorChanged){
            this.originalGenerator.set(this.modifiedGenerator);
            this.proxy.writeConfig_Generator(callback,scope);
        }else{
            callback.call(scope);
        }
    },

    /** 
     * Write config csv
     *
     * @param {Function} callback
     * @param {Object} scope
     *
     * @private
     *
     */
    writeConfig_CSV: function(callback,scope){
        if(this.csvChanged){
            this.originalCSV.addCSV(this.modifiedCSV);
            this.generatorChanged= this.originalGenerator.seenCSV(this.originalCSV);
            this.proxy.writeConfig_CSV(callback,scope);
        }else{
            callback.call(scope);
        }
    },

    /** 
     * Add to cache
     *
     * @param {Array} records
     *
     * @private
     *
     */
    addToCache: function(records) {
        if(records){
            if(Ext.isArray(records)){
                var l= records.length;
                for(var i=0;i<l;i++){
                    var record= records[i];
                    this.addToCache(record);
                }
            }else{
                var oid= records.getOid();
                //console.log('addToCache',oid,records)
                if(oid!==undefined){
                    this.cache[oid]= records;
                }else{
                    Ext.cf.util.Logger.error('Transaction.addToCache: Tried to add a record without an oid.',records);
                }
            }
        }
    },
    
    /** 
     * Add to list
     *
     * @param {Array} list
     * @param {Array} records
     *
     * @private
     *
     */
    addToList: function(list,records) {
        if(records){
            if(Ext.isArray(records)){
                var l= records.length;
                for(var i=0;i<l;i++){
                    var record= records[i];
                    var oid= record.getOid();
                    list.push(oid);
                }
            }else{
                list.push(records.getOid());
            }
        }
    },
    
    /** 
     * Get records for list
     *
     * @param {Array} list
     *
     * @private
     *
     */
    getRecordsForList: function(list) {
        var records= [];
        var l= list.length;
        for(var i=0;i<l;i++){
            var id= list[i];
            records.push(this.cache[id]);
        }
        return records;
    }
        
});

  
  
