Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    items: [
        {xtype:'container',itemId:'message_box',tpl:'Hello, <tpl>{_refObjectName}</tpl>'},
        {xtype:'container',itemId:'display_box'} 
        /*,
        {xtype:'tsinfolink'}
        */
    ],
    launch: function() {
        // this.down('#message_box').update(this.getContext().getUser());
        var me = this;

        me.down('#display_box').add({
            xtype: 'almportfolioitemtimeline',
            context: me.getContext(),
            listeners: {
                scope: this,
                taskclick: function( gantt, taskRecord, e, eOpts ) {
                    this.logger.log("clicked ", taskRecord);
                    this.showDialog(taskRecord,gantt);
                }
            }
        });
    },
    showDialog: function(taskRecord,gantt){
        this.logger.log('showDialog ', taskRecord.get('PlannedStartDate'),taskRecord.get('PlannedEndDate'));
        if ( this.dialog ) { this.dialog.destroy(); }
        this.dialog = Ext.create('Rally.technicalservices.dialog.TaskDialog',{
            artifact: taskRecord,
            title: taskRecord.get('FormattedID') + ": " + taskRecord.get('Name'),
            listeners: {
                scope: this,
                updateClicked: function(dialog, artifact, planned_start_date, planned_end_date) {
                    this.logger.log("update", planned_start_date, planned_end_date);
                    artifact.set('PlannedStartDate', Rally.util.DateTime.toIsoString(planned_start_date));
                    artifact.set('PlannedEndDate', Rally.util.DateTime.toIsoString(planned_end_date));
                    artifact.save();
                }
            }
        });
        this.dialog.show();
    }
});
