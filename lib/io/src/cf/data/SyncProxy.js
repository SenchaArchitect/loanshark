/** 
 * @private
 *
 */ 
Ext.define('Ext.cf.data.SyncProxy', {
    extend: 'Ext.data.Proxy',
    requires: [
        'Ext.cf.data.Transaction',
        'Ext.cf.data.Updates',
        'Ext.cf.data.DatabaseDefinition',
        'Ext.cf.data.ReplicaDefinition',
        'Ext.cf.ds.CS',
        'Ext.cf.ds.CSV',
        'Ext.cf.ds.ECO',
        'Ext.cf.Utilities',
        'Ext.cf.data.SyncModel',
        'Ext.cf.data.Update',
        'Ext.cf.data.ModelWrapper',
        'Ext.cf.util.Logger'
    ],

    config: {
        store: undefined,
        databaseDefinition: undefined,
        replicaDefinition: undefined,
    },

    databaseName: undefined,
    csv: undefined,
    generator: undefined,
    userModel: undefined,
    idProperty: undefined,
    
    /** 
     * ASync Initialize
     *
     * @param {Object} config
     * @param {Function} callback
     * @param {Object} scope
     *
     */
    asyncInitialize: function(config,callback,scope) {
        //
        Ext.cf.Utilities.check('SyncProxy', 'asyncInitialize', 'config', config, ['store','databaseDefinition','replicaDefinition']);
        //
        this.databaseName= config.databaseDefinition.databaseName;
        this.setStore(config.store);
        this.initConfig(config);
        this.setDatabaseDefinition(Ext.create('Ext.cf.data.DatabaseDefinition',config.databaseDefinition));
        this.setReplicaDefinition(Ext.create('Ext.cf.data.ReplicaDefinition',config.replicaDefinition));
        this.loadConfig(config,function(){
            Ext.cf.util.Logger.info("SyncProxy.asyncInitialize: Opened database '"+this.databaseName+"'");
            callback.call(scope,{r:'ok'});
        },this);
    },

    /** 
     * Create
     *
     * @param {Object} operation
     * @param {Function} callback
     * @param {Object} scope
     *
     */
    create: function(operation, callback, scope) {
        Ext.create('Ext.cf.data.Transaction',this,function(t){
            var records= operation.getRecords();
            records.forEach(function(record) {
                var cs= t.generateChangeStamp();
                var oid= cs.asString();
                var eco= record.eco= Ext.create('Ext.cf.ds.ECO',{
                    oid: oid,
                    data: Ext.getVersion("extjs") ? record.data : record.getData(),
                    state: {}
                });
                Ext.apply(record,Ext.cf.data.ModelWrapper);                
                eco.setValueCS(t,'_oid',oid,cs);
                eco.forEachValue(function(path,value) {
                    if (path[0]!=='_oid') {
                        eco.setCS(t,path,t.generateChangeStamp());
                    }
                },eco);
                // the user id is the oid.
                record.data[this.idProperty]= record.getOid(); // warning: don't call record.set, it'll cause an update after the add
            },this);
            t.create(records);
            t.commit(function(){
                records.forEach(function(record) {
                    record.needsAdd= false;
                    record.phantom= false;
                },this);
                operation.setSuccessful();
                operation.setCompleted();
                this.doCallback(callback,scope,operation);
            },this);
        },this);
    },

    /** 
     * Read
     *
     * @param {Object} operation
     * @param {Function} callback
     * @param {Object} scope
     *
     */
    read: function(operation, callback, scope) {
    
        function makeResultSet(records) {
            records= Ext.Array.filter(records,function(record){
                return record!==undefined && Ext.cf.data.SyncModel.isNotDestroyed(record);
            },this);
            operation.setResultSet(Ext.create('Ext.data.ResultSet', {
                records: records,
                total  : records.length,
                loaded : true
            }));
            operation.setSuccessful();
            operation.setCompleted();
            this.doCallback(callback,scope,operation);
        }
        
        if (operation.id!==undefined) {
            this.getStore().readByOid(operation.id,function(record) {
                makeResultSet.call(this,[record]);
            },this);
        } else if (operation._oid!==undefined) {
            this.getStore().readByOid(operation._oid,function(record) {
                makeResultSet.call(this,[record]);
            },this);
        } else {
            this.getStore().readAll(function(records) {
                makeResultSet.call(this,records);
            },this);
        }
    },

    /** 
     * Update
     *
     * @param {Object} operation
     * @param {Function} callback
     * @param {Object} scope
     *
     */
    update: function(operation, callback, scope) {
        if(Ext.cf.data.SyncModel.areDecorated(operation.getRecords())){
            Ext.create('Ext.cf.data.Transaction',this,function(t){
                var records= operation.getRecords();
                records.forEach(function(record) {
                    record.setUpdateState(t);
                },this);
                t.update(records);
                t.commit(function(){
                    operation.setSuccessful();
                    operation.setCompleted();
                    this.doCallback(callback,scope,operation);
                },this);
            },this);
        }else{
            records.forEach(function(record) {
                record.dirty= false; // make sure that we don't re-update the record
            },this);
            Ext.cf.util.Logger.warn('SyncProxy.update: Tried to update a model that had not been read from the store.');
            Ext.cf.util.Logger.warn(Ext.encode(operation.getRecords()));
            this.doCallback(callback,scope,operation);
        }
    },

    /** 
     * Destroy
     *
     * @param {Object} operation
     * @param {Function} callback
     * @param {Object} scope
     *
     */
    destroy: function(operation, callback, scope) {
        //Ext.cf.util.Logger.info('SyncProxy.destroy:',operation)
        if(Ext.cf.data.SyncModel.areDecorated(operation.getRecords())){
            Ext.create('Ext.cf.data.Transaction',this,function(t){
                var records= operation.getRecords();
                records.forEach(function(record) {
                    record.setDestroyState(t);
                },this);
                t.update(records);
                t.commit(function(){
                    operation.setSuccessful();
                    operation.setCompleted();
                    operation.action= 'destroy';
                    this.doCallback(callback,scope,operation);
                },this);
            },this);
        }else{
            Ext.cf.util.Logger.warn('SyncProxy.destroy: Tried to destroy a model that had not been read from the store.');
            Ext.cf.util.Logger.warn(Ext.encode(operation.getRecords()));
            this.doCallback(callback,scope,operation);
        }
    },

    /** 
     * Clear
     *
     * @param {Function} callback
     * @param {Object} scope
     *
     */
    clear: function(callback,scope) {
        var store= this.getStore();
        store.clear(function(){
            store.removeConfig('databaseDefinition',function(){
                store.removeConfig('replicaDefinition',function(){
                    store.removeConfig('csv',function(){
                        store.removeConfig('generator',callback,scope);
                    },this);
                },this);
            },this);
        },this);
    },

    /** 
     * Reset
     *
     * @param {Function} callback
     * @param {Object} scope
     *
     */
    reset: function(callback,scope) {
        var store= this.getStore();
        store.clear(function(){
            store.removeConfig('csv',function(){
                readConfig_CSV({},callback,scope);
            },this);
        },this);
    },

    /** 
     * Set Model
     *
     * @param {Object} userModel
     * @param {Object} setOnStore
     *
     */
    setModel: function(userModel, setOnStore) {
        this.userModel= userModel;
        var extjsVersion = Ext.getVersion("extjs");
        if(extjsVersion) {
            this.idProperty= userModel.prototype.idProperty;
        }else{
            this.idProperty= userModel.getIdProperty();            
            userModel.setIdentifier({type:'cs'}); // JCM we're overwriting theirs...
        }
        // JCM write the definition?
        this.getStore().setModel(this.userModel);
    },

    /** 
     * Replica Number
     *
     */
    replicaNumber: function() {
        return this.generator.r;
    },

    /** 
     * Add Replica numbers
     *
     * @param {Object} csv
     * @param {Function} callback
     * @param {Object} scope
     *
     */
    addReplicaNumbers: function(csv,callback,scope) {
        this.csv.addReplicaNumbers(csv);
        this.writeConfig_CSV(callback,scope);
    },

    /** 
     * Set Replica number
     *
     * @param {Number} new_replica_number
     * @param {Function} callback
     * @param {Object} scope
     *
     */
    setReplicaNumber: function(new_replica_number,callback,scope) {
        var old_replica_number= this.replicaNumber();
        Ext.cf.util.Logger.info('SyncProxy.setReplicaNumber: change from',old_replica_number,'to',new_replica_number);
        this.getStore().changeReplicaNumber(old_replica_number,new_replica_number,function(){
            this.getReplicaDefinition().changeReplicaNumber(new_replica_number);
            this.csv.changeReplicaNumber(old_replica_number,new_replica_number);
            this.generator.setReplicaNumber(new_replica_number);
            this.writeConfig_Replica(function(){
                this.writeConfig_Generator(function(){
                    this.writeConfig_CSV(callback,scope);
                },this);
            },this);
        },this);
    },

    /** 
     * Get updates
     *
     * @param {Object} csv
     * @param {Function} callback
     * @param {Object} scope
     *
     */
    getUpdates: function(csv,callback,scope) {
        //
        // The server might know about more replicas than the client,
        // so we add those unknown replicas to the client's csv, so 
        // that we will take account of them in the following.
        //
        csv.addReplicaNumbers(this.csv);
        //
        // Check if we have any updates for the server.
        // We will do if our CVS dominate their CVS.
        //
        var r= this.csv.dominant(csv);
        if(r.dominant.length===0){
            //
            // We have no updates for the server.
            //
            var updates_csv= Ext.create('Ext.cf.ds.CSV');
            //
            // Check if the server has any updates for us. 
            //
            var required_csv= Ext.create('Ext.cf.ds.CSV');
            var i, l= r.dominated.length;
            for(i=0;i<l;i++){
                required_csv.addCS(this.csv.get(r.dominated[i]));
            }
            callback.call(scope,Ext.create('Ext.cf.data.Updates'),updates_csv,required_csv);
        }else{
            if(!csv.isEmpty()){
                Ext.cf.util.Logger.info('SyncProxy.getUpdates: Get updates from',csv.asString());
                Ext.cf.util.Logger.info('SyncProxy.getUpdates: Dominated Replicas:',Ext.Array.pluck(r.dominated,'r').join(', '));
            }
            //
            // Get a list of updates that have been seen since the point
            // described by the csv.
            //
            var updates= [];
            this.getStore().readByCSV(csv, function(records){
                var i, l= records.length;
                for(i=0;i<l;i++){
                    updates= updates.concat(records[i].getUpdates(csv));
                }
                //
                // This sequence of updates will bring the client up to the point
                // described by the csv received plus the csv here. Note that there
                // could be no updates, but that the csv could have still been brought
                // forward, so we might need to send the resultant csv, even though
                // updates is empty. 
                //
                var updates_csv= Ext.create('Ext.cf.ds.CSV');
                updates_csv.addX(r.dominant); // we only need to send the difference in the csv's
                //
                // We also compute the csv that will bring the server up to the
                // point described by the csv received. The client uses this to
                // determine the updates to send to the server.
                //
                var required_csv= Ext.create('Ext.cf.ds.CSV');
                required_csv.addX(r.dominated); // we only need to send the difference in the csv's
                //
                callback.call(scope,Ext.create('Ext.cf.data.Updates',updates),updates_csv,required_csv);
            }, this);
        }        
    },

    /** 
     * Put updates
     *
     * @param {Array} updates
     * @param {Object} updates_csv
     * @param {Function} callback
     * @param {Object} scope
     *
     */
    putUpdates: function(updates,updates_csv,callback,scope) {
        Ext.create('Ext.cf.data.Transaction',this,function(t){
            if(updates.isEmpty()){
                //
                // Even though updates is empty, the received csv could still be more
                // recent than the local csv, so the local csv still needs to be updated.
                //
                t.updateCSV(updates_csv);
                t.commit(function(){
                    callback.call(scope,{r:'ok'});
                },this);
            }else{
                var computed_csv= Ext.create('Ext.cf.ds.CSV');
                var oids= updates.oids();
                t.readByOids(oids,function(){ // prefetch
                    updates.forEach(function(update) {
                        this.applyUpdate(t,update,function(){},this); // read from memory
                        computed_csv.addCS(update.c);
                    },this);
                    this.putUpdates_done(t,updates,updates_csv,computed_csv,callback,scope);
                },this);
            }
        },this);
    },
    
    /** 
     * Put updates done
     *
     * @param {Object} t
     * @param {Array} updates
     * @param {Object} updates_csv
     * @param {Object} computed_csv
     * @param {Function} callback
     * @param {Object} scope
     *
     */
    putUpdates_done: function(t,updates,updates_csv,computed_csv,callback,scope) {
        //
        // This sequence of updates will bring the client up to the point
        // described by the csv received plus the csv here. Note that there
        // could be no updates, but that the csv could have still been brought
        // forward. 
        //
        // We also compute a new csv from all the updates received, just in
        // case the peer didn't send one, or sent a bad one.
        //
        // Make sure to bump forward our clock, just in case one of our peers 
        // has run ahead.
        //
        t.updateCSV(computed_csv);
        t.updateCSV(updates_csv);
        t.commit(function(createdRecords,updatedRecords){
            // discard the created, then deleted
            createdRecords= Ext.Array.filter(createdRecords,Ext.cf.data.SyncModel.isNotDestroyed);
            // move the updated, then deleted
            var x= Ext.Array.partition(updatedRecords,Ext.cf.data.SyncModel.isDestroyed);
            var destroyedRecords= x[0];
            updatedRecords= x[1];
            callback.call(scope,{
                r: 'ok',
                created: createdRecords,
                updated: updatedRecords,
                removed: destroyedRecords
            });
        },this);
    },
    
    /** 
     * Apply update
     *
     * @param {Object} t
     * @param {Object} update
     * @param {Function} callback
     * @param {Object} scope
     * @param {Object} last_ref
     *
     */
    applyUpdate: function(t,update,callback,scope,last_ref) { // Attribute Value - Conflict Detection and Resolution
        t.readCacheByOid(update.i,function(record) {
            if (record) {
                this.applyUpdateToRecord(t,record,update);
                callback.call(scope);
            } else {
                Ext.cf.util.Logger.debug('SyncProxy.applyUpdate:',Ext.cf.data.Update.asString(update),'accepted, creating new record');
                this.applyUpdateCreatingNewRecord(t,update);
                callback.call(scope);
            }
        },this);
    },

    /** 
     * Apply update - create new record
     *
     * @param {Object} t
     * @param {Object} update
     *
     */
    applyUpdateCreatingNewRecord: function(t,update) {
        var record;
        // no record with that oid is in the local store...
        if (update.p==='_oid') {
            // ...which is ok, because the update is intending to create it
            record= this.createModelFromOid(t,update.v,update.c);
            //console.log('applyUpdate',Ext.encode(record.eco),'( create XXX )');
        } else {
            // ...which is not ok, because given the strict ordering of updates
            // by change stamp the update creating the object must be sent first.
            // But, let's be forgiving and create the record to receive the update. 
            Ext.cf.util.Logger.warn("Update received for unknown record "+update.i,Ext.cf.data.Update.asString(update));
            record= this.createModelFromOid(t,update.i,update.i);
            record.setValueCS(t,update.p,update.v,update.c);
        }
        t.create([record]);
    },

    /** 
     * Create model from Oid
     *
     * @param {Object} t
     * @param {Number/String} oid
     * @param {Object} cs
     *
     * @return {Object} record
     *
     */
    createModelFromOid: function(t,oid,cs) {
        Ext.cf.util.Logger.info('SyncProxy.createModelFromOid:',oid,cs);
        var record= new this.userModel({});
        record.phantom= false; // this prevents the bound Ext.data.Store from re-adding this record
        var eco= record.eco= Ext.create('Ext.cf.ds.ECO',{
            oid: oid,
            data: record.data,
            state: {}
        });
        Ext.apply(record,Ext.cf.data.ModelWrapper);                
        record.setValueCS(t,'_oid',oid,cs);
        return record;
    },

    /** 
     * Apply update to record
     *
     * @param {Object} t
     * @param {Object} record
     * @param {Object} update
     *
     * @return {Boolean} True/False => Accepted/Rejected
     *
     */
    applyUpdateToRecord: function(t,record,update) {
        if (record.putUpdate(t,update)) {
            t.update([record]);
            Ext.cf.util.Logger.info('SyncProxy.applyUpdateToRecord:',Ext.cf.data.Update.asString(update),'accepted');
            return true;
        } else {
            Ext.cf.util.Logger.info('SyncProxy.applyUpdateToRecord:',Ext.cf.data.Update.asString(update),'rejected');
            return false;
        }
    },

    // read and write configuration

    /** 
     * Load config
     *
     * @param {Object} config
     * @param {Function} callback
     * @param {Object} scope
     *
     */
    loadConfig: function(config,callback,scope) {
        this.readConfig_Database(config,function(){
            this.readConfig_Replica(config,function(){
                this.readConfig_CSV(config,function(){
                    this.readConfig_Generator(config,function(){
                        callback.call(scope);
                    },this);
                },this);
            },this);
        },this);
    },

    /** 
     * Read config database
     *
     * @param {Object} config
     * @param {Function} callback
     * @param {Object} scope
     *
     */
    readConfig_Database: function(config,callback,scope) {
        this.readConfig(Ext.cf.data.DatabaseDefinition,'databaseDefinition',config.databaseDefinition,{},function(r,definition) {
            this.setDatabaseDefinition(definition);
            callback.call(scope,r,definition);
        },this);
    },

    /** 
     * Read config replica
     *
     * @param {Object} config
     * @param {Function} callback
     * @param {Object} scope
     *
     */
    readConfig_Replica: function(config,callback,scope) {
        this.readConfig(Ext.cf.data.ReplicaDefinition,'replicaDefinition',config.replicaDefinition,{},function(r,definition) {
            this.setReplicaDefinition(definition);
            callback.call(scope,r,definition);
        },this);
    },

    /** 
     * Read config generator
     *
     * @param {Object} config
     * @param {Function} callback
     * @param {Object} scope
     *
     */
    readConfig_Generator: function(config,callback,scope) {
        this.readConfig(Ext.cf.ds.LogicalClock,'generator',{},{},function(r,generator){
            this.generator= generator;
            if(this.generator.r===undefined){
                this.generator.r= config.replicaDefinition.replicaNumber; 
            }
            if(config.clock){
                this.generator.setClock(config.clock);
            }
            callback.call(scope,r,generator);
        },this); 
    },

    /** 
     * Read config csv
     *
     * @param {Object} config
     * @param {Function} callback
     * @param {Object} scope
     *
     */
    readConfig_CSV: function(config,callback,scope) {
        this.readConfig(Ext.cf.ds.CSV,'csv',{},{},function(r,csv){
            this.csv= csv;
            callback.call(scope,r,csv);
        },this); 
    },

    /** 
     * Write config replica
     *
     * @param {Function} callback
     * @param {Object} scope
     *
     */
    writeConfig_Replica: function(callback,scope) {
        this.writeConfig('replicaDefinition',this.getReplicaDefinition(),callback,scope);
    },
    
    /** 
     * Write config generator
     *
     * @param {Function} callback
     * @param {Object} scope
     *
     */
    writeConfig_Generator: function(callback,scope) {
        this.writeConfig('generator',this.generator,callback,scope);
    },

    /** 
     * Write config csv
     *
     * @param {Function} callback
     * @param {Object} scope
     *
     */
    writeConfig_CSV: function(callback,scope) {
        this.writeConfig('csv',this.csv,callback,scope);
    },
                
    /** 
     * Write config
     *
     * @param {Number/String} id
     * @param {Object} object
     * @param {Function} callback
     * @param {Object} scope
     *
     */
    writeConfig: function(id, object, callback, scope) {
        if(object){
            this.getStore().writeConfig(id,object.as_data(),callback,scope);
        }else{
            callback.call(scope);
        }
    },

    /** 
     * Read config
     *
     * @param {String} klass
     * @param {Number/String} id
     * @param {Object} default_data
     * @param {Object} overwrite_data
     * @param {Function} callback
     * @param {Object} scope
     *
     */
    readConfig: function(Klass, id, default_data, overwrite_data, callback, scope) {
        this.getStore().readConfig(id,function(data) {
            var name;
            var r= (data===undefined) ? 'created' : 'ok';
            if (default_data!==undefined) {
                if (data===undefined) {
                    data= default_data;
                } else {
                    for(name in default_data) {
                        if (data[name]===undefined) {
                            data[name]= default_data[name];
                        }
                    }
                }
            }
            if (overwrite_data!==undefined) {
                if (data===undefined) {
                    data= overwrite_data;
                } else {
                    for(name in overwrite_data) {
                        if (data[name]!==overwrite_data[name]) {
                            data[name]= overwrite_data[name];
                        }
                    }
                }
            }

            callback.call(scope,r,new Klass(data));
        },this);
    },

    /** 
     * Callback
     *
     * @param {Function} callback
     * @param {Object} scope
     * @param {String} operation
     *
     */
    doCallback: function(callback, scope, operation) {
        if (typeof callback == 'function') {
            callback.call(scope || this, operation);
        }
    }

});

/*
 * @ignore
 * @private
 */
Ext.define('Ext.data.identifier.CS', {
    alias: 'data.identifier.cs',
    
    config: {
        model: null
    },

    /**
     * @private
     *
     * Constructor
     *
     * @param {Object} config
     *
     */
    constructor: function(config) {
        this.initConfig(config);
    },

    /**
     * @private
     *
     * Generate
     *
     * @param {Object} record
     *
     */
    generate: function(record) {
        return undefined;
    }
});

Ext.Array.partition= function(a,fn,scope) {
    var r1= [], r2= [];
    if (a) {
        var j, l= a.length;
        for(var i= 0;i<l;i++) {
            j= a[i];
            if (j!==undefined) {
                if (fn.call(scope||j,j)) {
                    r1.push(j);
                } else {
                    r2.push(j);
                }
            }
        }
    }
    return [r1,r2];
};

