/** 
 *
 * This class provides a data synchronization service. It stores Ext.data.Model data in
 * HTML5 localStorage as JSON encoded values, and replicates those data values
 * to the Sencha.io servers. Operations can be performed on the store even when the
 * the device is offline. Offline updates are replicated to the servers when the device
 * next comes online.
 *  
 * ## Store Creation
 *
 * Models stored in a sync store are similar to Models stored in any Ext.data.Store,
 * with the exception that the sync store includes its own id generator, so an 'id'
 * field need not be declared.
 *
 *      Ext.define("Example.model.Model", {
 *          extend: "Ext.data.Model", 
 *          config: {
 *              fields: [
 *                  {name: 'name', type:'string'}, 
 *              ]
 *          }
 *      });
 *  
 * A store is declared in a similar way to any Ext.data.Store, with the type being
 * set to 'syncstorage'. 
 *
 *           Ext.define('Example.store.Store', {
 *               extend: 'Ext.data.Store',
 *               config: {
 *                   model: 'Example.model.Model',
 *                   proxy: {
 *                       type: 'syncstorage',
 *                       id: 'mystore'
 *                   },
 *               }
 *           });
 *
 * The sync store is used just like any Ext.data.Store, for example you can load
 * records, add them, or create and save them:
 *
 *          store.load();
 *          store.add({name:'bob'});
 *          var model= Ext.create('Model',{name:'joe'})
 *          model.save();
 * 
 * All of these operations are executed against the in-memory store. 
 *
 * It is only when the `sync` method is called that the store commits any 
 * changes to the proxy through its CRUD interface; create, read, update,
 * and destroy. 
 *
 *          store.sync();
 *
 * {@img store1.png}
 *
 * ## One User, One Device  
 *
 * So far, what we have described, is exactly how any Ext.data.Store behaves.
 * The advantage of the sync proxy is that it will synchronize the local
 * store to the Sencha.io servers. For a user with one device this allows
 * them to backup their data to the cloud, and thus fully recover from a
 * data loss.
 *
 * When the `sync` method is called and the device is offline then once any 
 * local updates have been applied to localStorage then the call to sync will
 * terminate and control will return to the app. However, if the device
 * is online then the proxy will initiate a replication session with the 
 * Sencha.io servers. The client uses a replication protocol to send any
 * updates required to bring the server up to date with respect to the client.
 *
 * {@img store3.png}
 *
 * ## User Owned Store
 *
 * All sync stores have an owner.
 * By default all stores are created belonging to the currently authenticated user.
 * To enable your app for user authentication it must be associated with a group.
 * You can create a group and associate it with your app using the [Developer Console](http://developer.sencha.io)
 *
 * (screen shot here)
 * 
 * If no
 * user is authenticated, then the app will not be able to syncronize the store
 * with the server and will fail with an access control error.
 *
 *      
 *           Ext.define('Example.store.Store', {
 *               extend: 'Ext.data.Store',
 *               config: {
 *                   model: 'Example.model.Model',
 *                   proxy: {
 *                       type: 'syncstorage',
 *                       owner: 'user',
 *                       id: 'mystore'
 *                   },
 *               }
 *           });
 *
 * ## One User, Many Devices
 *
 * A user can have many devices, and they can have a copy of a particular sync
 * store on each of them. This gives them the benefit of device portability.
 * They have access to the same data from whichever device they happen to be
 * using, and can update their data right there.
 *
 * This capability is provided by the proxy. The replication protocol operates
 * in both directions, from client to server for local updates, and also from
 * server to client for remote updates. Remote updates are handled by the proxy,
 * which applies the updates to localStorage and to the bound Ext.data.Store.
 * Any views bound to the store will recieve events as if the update operations
 * had originated locally. In this way the views will be updated automatically
 * to reflect any underlying changes to the data.
 *
 * {@img store4.png}
 *
 * ## Private Stores
 *
 * By default a User owned store is private and so is accessible only by that user.
 * No other users can access the store.
 *
 *           Ext.define('Example.store.Store', {
 *               extend: 'Ext.data.Store',
 *               config: {
 *                   model: 'Example.model.Model',
 *                   proxy: {
 *                       type: 'syncstorage',
 *                       owner: 'user',
 *                       access: 'private',
 *                       id: 'mystore'
 *                   },
 *               }
 *           });
 *
 * ## Public Stores
 *
 * A User owned store can be declared as public which means that
 * the store is accessible to all the members of that group of users.
 *
 *           Ext.define('Example.store.Store', {
 *               extend: 'Ext.data.Store',
 *               config: {
 *                   model: 'Example.model.Model',
 *                   proxy: {
 *                       type: 'syncstorage',
 *                       owner: 'user',
 *                       access: 'public',
 *                       id: 'mystore'
 *                   },
 *               }
 *           });
 *
 * ## Many Users, Many Devices
 *
 * Just as with the previous scenario of a single user with many devices,
 * when many users are sharing a store there is a copy of the store on
 * many devices. Every copy of the store can be updated and the clients
 * keep the replicas in sync by exchanging updates with the Sencha.io
 * servers.
 *
 * {@img store5.png} 
 *
 * Because updates can be applied independently at the same time on
 * different copies of the same store conflicting updates can occur.
 * The proxy includes a conflict detection and resolution algorithm
 * that ensures that all copies of the store will eventually contain
 * exactly the same data. The resolution algorithm merges conflicting
 * objects and selects the last update for conflicting primitive values.
 *
 * ## Synchronization Policy
 *
 * Since the replication protocol is always client initiated updates
 * are only exchanged when the client explicitly calls the `sync` method on
 * the store. A call to `sync` when there are no local updates pending will
 * still initiate a replication session to collect any remote updates.
 *
 *          store.sync();
 *
 * For this reason the app should implement a sync policy. Common policies are:
 *
 *  - call sync when a local change occurs
 *  - call sync when the user takes some action, like clicking on 'refresh'
 *  - call sync on an internal timer, perhaps every few seconds
 *  - call sync when a message arrives on a shared channel, which is used to
 *    broadcast an update notification.
 */
Ext.define('Ext.io.Store', {
    extend: 'Ext.io.Object',

    statics: {

        /** 
         * @private
         * @static 
         *
         * @param {Object} options
         *  
         * @param {Function} callback The function to be called after getting store.
         * @param {Object} error object
         *
         * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
         * the callback function.
         */
        get: function(options,callback,call) {
            this.getObjects(options.id, callback, scope);
        }
    },

    /**
     * 
     * @param {Object} options
     *  
     * @param {Function} callback The function to be called after finding replicas.
     * @param {Object} error object
     *
     * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
     * the callback function.
     */
    findReplicas: function(options,callback,scope) {
        this.findRelatedObjects(Ext.io.Replica, this.getId(), null, options.query, callback, scope);    
    },

});

