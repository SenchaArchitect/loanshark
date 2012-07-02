/**
 * 
 * @private
 *
 */
Ext.define('Ext.cf.data.Update', {

    statics: {

        /**
         * As string
         *
         * @param {Object} u
         *
         */
        asString: function(u) {
            if(Ext.isArray(u)){
                return '['+Ext.Array.map(u,Ext.cf.data.Update.asString).join(', ')+']';
            }else if(u instanceof Ext.cf.data.Updates){
                return Ext.cf.data.Update.asString(u.updates);
            }else{
                var p= Ext.isArray(u.p) ? u.p.join() : u.p;
                var v= u.v;
                if (typeof u.v==='object'){
                        v= Ext.encode(u.v);
                }
                return '('+u.i+' . '+p+' = \''+v+'\' @ '+u.c.asString()+')';
            }
        }

    }
    
});