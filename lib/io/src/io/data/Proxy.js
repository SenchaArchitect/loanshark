/** 
 * @private
 * The proxy is documented in the Ext.io.Store class, as is makes more sense
 * to have that in the docs structure.
 */
Ext.define('Ext.io.data.Proxy', {
    extend: 'Ext.data.proxy.Client',
    alias: 'proxy.syncstorage',
    requires: [
        'Ext.cf.Utilities',
        'Ext.cf.data.SyncProxy',
        'Ext.cf.data.SyncStore',
        'Ext.cf.data.Protocol'
    ],

    proxyInitialized: false,
    proxyLocked: true,
   
    config: {
        databaseName: undefined,
        deviceId: undefined,
        owner: null,
        access: null,
        userId: undefined,
        groupId: undefined,
        localSyncProxy: undefined,
        clock: undefined
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
        this.logger = Ext.cf.util.Logger;
        Ext.cf.Utilities.check('Ext.io.data.Proxy', 'constructor', 'config', config, ['id']);
        this.setDatabaseName(config.id)
        this.proxyLocked= true;
        this.proxyInitialized= false;
        this.initConfig(config);
        this.callParent([config]);
        //
        // Check the Database Directory
        //   The store might be known about, but was cleared.
        //
        var directory= Ext.io.Io.getStoreDirectory();
        var db= directory.get(this.getDatabaseName(), "syncstore");
        if(db){
            directory.add(this.getDatabaseName(), "syncstore");
        }
    },

    /**
     * @private
     * Create
     *
     */
    create: function(){
        var a= arguments;
        this.with_proxy(function(remoteProxy){
            remoteProxy.create.apply(remoteProxy,a);
        },this);
    },

    /**
     * @private
     * Read
     *
     */
    read: function(){
        var a= arguments;
        this.with_proxy(function(remoteProxy){
            remoteProxy.read.apply(remoteProxy,a);
        },this);
    },

    /**
     * @private
     * Update
     *
     */
    update: function(){
        var a= arguments;
        this.with_proxy(function(remoteProxy){
            remoteProxy.update.apply(remoteProxy,a);
        },this);
    },

    /**
     * @private
     * Destroy
     *
     */
    destroy: function(){
        var a= arguments;
        this.with_proxy(function(remoteProxy){
            remoteProxy.destroy.apply(remoteProxy,a);
        },this);
    },

    /**
     * @private
     * Set Model
     *
     */
    setModel: function(){
        var a= arguments;
        this.with_proxy(function(remoteProxy){
            remoteProxy.setModel.apply(remoteProxy,a);
        },this);
        this.callParent(arguments);
    },
    
    /**
     * @private
     * Sync
     *
     * @param {Object} store The store this proxy is bound to. The proxy fires events on it to update any bound views.
     * @param {Function} callback
     * @param {Object} scope
     *
     */
    sync: function(store,callback,scope) {
      
        if(this.proxyLocked){
            // 
            // if there are local updates to be applied, then we should queue the call, and call it once the sync in progress has completed.
            //
            if(this.storeHasUpdates(store)){
                // JCM queue the request to sync
                // JCM do another sync when this one finishes
                // JCM we only have to queue one..?
                if(callback) {
                    callback.call(scope,{r:'error',message:'local updates do need to be synched, but a remote sync is currently in progress'});
                }
            }else{
                //
                // if there are no local updates, then we do nothing, since the sync in progress is already doing the requested sync. 
                //
                if(callback) {
                  callback.call(scope,{r:'ok',message:'no local updates to sync, and remote sync is already in progress'});
                }
            }
        } else {
            this.with_proxy(function(remoteProxy){
                this.proxyLocked= true;
                try {
                    //
                    // sync the local storage proxy
                    //
                    var changes= store.storeSync();
               
                    store.removed= []; // clear the list of records to be deleted
                    //
                    // sync the remote storage proxy
                    //
                    this.logger.info('Ext.io.data.Proxy.sync: Start sync of database:',this.getDatabaseName());
                    this.protocol.sync(function(r){
                        if(r.r=='ok'){
                            this.setDatabaseDefinitionRemote(true); // the server knows about the database now
                        }
                        this.updateStore(store,r.created,r.updated,r.removed);
                        this.proxyLocked= false;
                        this.logger.info('Ext.io.data.Proxy.sync: End sync of database:',this.getDatabaseName());
                        if(callback) {
                            callback.call(scope,r);
                        }
                    },this);
                } catch (e) {
                    this.proxyLocked= false;
                    this.logger.error('Ext.io.data.Proxy.sync: Exception thrown during synchronization');
                    this.logger.error(e);
                    this.logger.error(e.stack);
                    throw e;
                }
            },this);
        }
    },

    /**
     * @private
     *
     * Check if the store has any pending updates: add, update, delete
     *
     * @param {Object} store
     */
    storeHasUpdates: function(store) {
        var toCreate = store.getNewRecords();
        if(toCreate.length>0) {
            return true;
        }else{
            var toUpdate = store.getUpdatedRecords();
            if(toUpdate.length>0){
                return true;
            }else{
                var toDestroy = store.getRemovedRecords();
                return (toDestroy.length>0);
            }
        }
    },

    /**
     * @private
     *
     * Update the store with any created, updated, or deleted records.
     *
     * Fire events so that any bound views will update themselves.
     *
     * @param {Object} store
     * @param {Array} createdRecords
     * @param {Array} updatedRecords
     * @param {Array} removedRecords
     */
    updateStore: function(store,createdRecords,updatedRecords,removedRecords){
        var changed = false;
        if(createdRecords && createdRecords.length>0) {
            store.data.addAll(createdRecords);
            store.fireEvent('addrecords', this, createdRecords, 0);
            changed = true;
        }
        if(updatedRecords && updatedRecords.length>0) {
            store.data.addAll(updatedRecords);
            for(var i = 0, l = updatedRecords.length; i < l; i++ ){
              store.fireEvent('updaterecord', this, updatedRecords[i]);  
            }
            changed = true;
        }
        if(removedRecords && removedRecords.length>0) {
            var l= removedRecords.length;
            for(var i=0;i<l;i++){
                var id= removedRecords[i].getId();
                store.data.removeAt(store.data.findIndexBy(function(i){ // slower, but will match
                    return i.getId()===id;
                }));
            }
            store.fireEvent('removerecords', this, removedRecords);
            changed = true;
        }
        if(changed) {
            //
            // We only want to call refresh if something changed, otherwise sync will cause
            // UI strangeness as the components refresh for no reason.
            //
            store.fireEvent('refresh');
        }
    },
    
    /**
     * @private
     * Clear
     *
     * The proxy can be reused after it has been cleared.
     *
     */
    clear: function() {
        if(this.proxyInitialized) {
            this.proxyLocked= true;
            this.setDatabaseDefinitionLocal(false); // we no longer have a local copy of the data
            this.remoteProxy.clear(function(){ // JCM why are we clearing the remote... shouldn't it clear the local?
                delete this.localProxy;
                delete this.remoteProxy;
                delete this.protocol;
                this.proxyInitialized= false;
                this.proxyLocked= false;
            },this);
        }
    },
    
    // private

    /**
     * @private
     *
     * Set DB Definition = Local
     *
     * @param {Boolean/String} flag
     *
     */
    setDatabaseDefinitionLocal: function(flag){
        Ext.io.Io.getStoreDirectory().update(this.getDatabaseName(), "syncstore", {local: flag});
    },
    
    /**
     * @private
     *
     * Set DB Definition = Remote
     *
     * @param {Boolean/String} flag
     *
     */
    setDatabaseDefinitionRemote: function(flag){
        Ext.io.Io.getStoreDirectory().update(this.getDatabaseName(), "syncstore", {remote: flag});
    },

    /**
     * @private
     *
     * create the local proxy, remote proxy, and protocol
     *
     * @param {Function} callback
     * @param {Object} scope
     *
     */
    with_proxy: function(callback,scope) {
        if(this.proxyInitialized){
            callback.call(scope,this.remoteProxy);
        }else{
            this.createLocalProxy(function(localProxy){
                this.localProxy= localProxy;
                this.createRemoteProxy(function(remoteProxy){
                    this.remoteProxy= remoteProxy;
                    
                    
                    this.protocol= Ext.create('Ext.cf.data.Protocol',{proxy:this.remoteProxy, owner: this.getOwner(), access: this.getAccess()});
                    Ext.cf.Utilities.delegate(this,this.remoteProxy,['read','update','destroy']);
                    this.setDatabaseDefinitionLocal(true); // we have a local copy of the data now
                    this.proxyLocked= false; // we're open for business
                    this.proxyInitialized= true;
                    callback.call(scope,remoteProxy);
                },this);
            },this);
        }
    },

    /**
     * @private
     *
     * create local storage proxy
     *
     * @param {Function} callback
     * @param {Object} scope
     *
     */
    createLocalProxy: function(callback,scope) {
        //
        // Local Storage Proxy
        //
        var syncStoreName= this.getLocalSyncProxy()||'Ext.cf.data.SyncStore';
        var localProxy= Ext.create(syncStoreName);
        localProxy.asyncInitialize(this.getCurrentConfig(),function(r){
            if(r.r!=='ok'){
                this.logger.error('Ext.io.data.Proxy: Unable to create local proxy:',syncStoreName,':',Ext.encode(r));
            }
            callback.call(scope,localProxy);
        },this);
    },

    /**
     * @private
     *
     * create remote storage proxy
     *
     * @param {Function} callback
     * @param {Object} scope
     *
     */
    createRemoteProxy: function(callback,scope) {
        var databaseDefinition= {
            databaseName: this.getDatabaseName(),
            generation: 0
        };
        var config= {
            databaseDefinition: databaseDefinition,
            replicaDefinition: {
                replicaNumber: 0
            },
            store: this.localProxy,
            clock: this.getClock()
        };
        var remoteProxy= Ext.create('Ext.cf.data.SyncProxy');
        remoteProxy.asyncInitialize(config,function(r){
            if(r.r!=='ok'){
                this.logger.error('Ext.io.data.Proxy: Unable to create remote proxy:',Ext.encode(r));
            }
            callback.call(scope,remoteProxy);
        },this);
    },

});

