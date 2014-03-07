Ext.define('Rally.technicalservices.dialog.DependencyDialog',{
    extend: 'Rally.ui.dialog.Dialog',
    alias:  'widget.tsdependencydialog',
    config: {
        /*
         * @cfg {Model} 
         * 
         * The the record of the dependency link (has a from and to field)
         */
        dependencyRecord: null,
        width: 300,
        height: 300
    },
    items: { 
        xtype:'panel',
        border:false
    },
   constructor: function(config) {
        this.mergeConfig(config);

        this.callParent([this.config]);
    },

    initComponent: function() {
        this.callParent(arguments);
        this.addCls('chooserDialog');

        this._buildForm();
        this._buildButtons();
    },
    _buildForm: function() {
        var form_box = this.down('panel').add({
                xtype:'container',
                itemId:'form_box',
                layout:'fit'
        });
        if ( this.dependencyRecord ) { 
            var from_oid = this.dependencyRecord.get("From");
            var to_oid = this.dependencyRecord.get("To");
            
            var link_summary = form_box.add({
                xtype:'container',
                itemId: 'linkSummary',
                margin: 10,
                tpl: '<tpl>{target} is dependent upon {source}</tpl>'
            });
            
            var link_items = form_box.add({
                xtype:'container',
                itemId:'linkItems',
                
                html: 'Loading...'
            });
            
            link_summary.update({ target: to_oid, source: from_oid });
            
            this._updateDependencyPopup(from_oid,to_oid,link_summary,link_items);
        } else {
            form_box.add({
                xtype:'container',
                html: 'Dependency not supplied'
            });
        }
        
    },
    _getPredecessorRenderer: function(value,metaData,record) {
        var url = Rally.nav.Manager.getDetailUrl(record);
        var anchor = "<a href='" + url + "' target='_blank'>" + record.get('FormattedID') + "</a>";
        return anchor;
    },
    _getSuccessorRenderer: function(value,record) {
        // in this case the value is a record (that's been embedded in the predecessor record)
        var url = Rally.nav.Manager.getDetailUrl(value);
        var anchor = "<a href='" + url + "' target='_blank'>" + value.get('FormattedID') + "</a>";
        return anchor;
    },
    _updateDependencyPopup: function(from_oid,to_oid,link_summary,link_items_container) {
        var me = this;
        var successor_renderer = me._getSuccessorRenderer;
        var predecessor_renderer = me._getPredecessorRenderer;

        var promises = [];
        promises.push(this._getDependencyEndPoints(from_oid, to_oid));
        promises.push(this._getDependencyItems(from_oid,to_oid));
        
        
        Deft.Promise.all(promises).then({
            scope: this,
            success: function(records) {
                link_summary.update(records[0]);
                var links = records[1];
                link_items_container.update('');
                link_items_container.removeAll(true);
                var link_store = Ext.create('Rally.data.custom.Store',{
                    data: links
                });
                
                link_items_container.add({
                    xtype:'rallygrid',
                    store: link_store,
                    height: this.height - 120,
                    showRowActionsColumn: false,
                    columnCfgs: [
                        { text:'Story', dataIndex: '_successor', flex: 1, renderer: successor_renderer },
                        { text:'Depends On', dataIndex: 'FormattedID', flex: 1, renderer: predecessor_renderer }
                    ]
                });
                
                
            },
            failure: function(error) {
                alert(error);
            }
        });
    },
    _getDependencyItems: function(from_oid,to_oid) {
        var me = this;
        var deferred = Ext.create('Deft.Deferred');
        var filters = [
          {property:'Feature.ObjectID',value:to_oid},
          {property:'Predecessors.ObjectID',operator: '!=',value:null}
        ];
        
        Ext.create('Rally.data.wsapi.Store',{
            model:'HierarchicalRequirement',
            filters:filters,
            autoLoad: true,
            fetch: ['FormattedID','Name','Predecessors'],
            listeners: {
                scope: this,
                load: function(data,stories) {
                    if ( stories.length > 0 ) {
                        var promises = [];
                        Ext.Array.each(stories,function(story){
                            promises.push(me._getCollectionFrom(story,"Predecessors"));
                        });
                        
                        Deft.Promise.all(promises).then({
                            success: function(records){
                                var predecessors = [];
                                var records = Ext.Array.flatten(records);
                                Ext.Array.each(records,function(record){
                                    var feature_object = record.get("Feature");                                    
                                    if ( feature_object && feature_object.ObjectID == from_oid ) {
                                        predecessors.push(record);
                                    }
                                });
                                deferred.resolve(predecessors);
                            },
                            failure: function(error) {
                                deferred.reject(error);
                            }
                        });
                        
                    } else {
                        deferred.resolve([]);
                    }
                }
            }
        });
        return deferred;
    },
    _getCollectionFrom:function(record,collection_field){
        var deferred = Ext.create('Deft.Deferred');
        record.getCollection(collection_field).load({
            fetch: ['FormattedID','ObjectID','Feature'],
            callback: function(predecessors,operation,success){
                Ext.Array.each(predecessors, function(predecessor){
                    predecessor.set("_successor",record);
                });
                deferred.resolve(predecessors);
            }
        });
        return deferred;
    },
    _getDependencyEndPoints: function(from_oid,to_oid) {
        var deferred = Ext.create('Deft.Deferred');
        var from_filter = Ext.create('Rally.data.wsapi.Filter', {
                property: 'ObjectID',
                operator: '=',
                value: from_oid
           });
           
           var to_filter = Ext.create('Rally.data.wsapi.Filter', {
                    property: 'ObjectID',
                 operator: '=',
                 value: to_oid
            });
           
           var filters = to_filter.or(from_filter);
       
        Ext.create('Rally.data.wsapi.Store',{
            model: 'PortfolioItem/Feature',
            filters: filters,
            autoLoad: true,
            fetch: ['FormattedID','Name','ObjectID'],
            listeners: {
                load: function(store,data){
                    var summary = { from: from_oid, to: to_oid };
                    Ext.Array.each( data, function(item){
                        item_oid = item.get('ObjectID');
                        if ( item_oid === from_oid ) {
                            summary.source = item.get('FormattedID');
                        }
                        if ( item_oid == to_oid ) {
                            summary.target = item.get('FormattedID');
                        }
                    });
                    deferred.resolve(summary);
                }
            }
        });
        return deferred;
    },
    _buildButtons: function() {
        this.down('panel').addDocked({
            xtype: 'toolbar',
            dock: 'bottom',
            padding: '0 0 10 0',
            layout: {
                type: 'hbox',
                pack: 'center'
            },
            ui: 'footer',
            items: [
                {
                    xtype: 'rallybutton',
                    text: 'OK',
                    cls: 'secondary small',
                    handler: this.close,
                    scope: this,
                    ui: 'link'
                }
            ]
        });

    }
});