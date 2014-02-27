Ext.define('Rally.technicalservices.dialog.TaskDialog',{
    extend: 'Rally.ui.dialog.Dialog',
    alias:  'widget.tstaskdialog',
    config: {
        /*
         * @cfg {Model} 
         * 
         * The task record shown on the timeline
         */
        artifact: null
    },
    items: { 
        xtype:'panel',
        border:false,
        items: [
            {
                xtype:'container',
                itemId:'form_box',
                layout:'fit',
                width: 300
            }
        ]
    },
   constructor: function(config) {
        this.mergeConfig(config);

        this.callParent([this.config]);
    },

    initComponent: function() {
        this.callParent(arguments);
        this.addEvents(
                /**
                 * @event updateClicked
                 * Fires when if the update button is clicked
                 * @param {Rally.technicalservices.dialog.TaskDialog} this
                 * @param {Rally.domain.WsapiModel} record
                 * @param {String} planned_start_date (in ISO)
                 * @param {String} planned_end_date (in ISO)
                 */
                'updateClicked'
        );

        this.addCls('chooserDialog');

        this._buildForm();
        this._buildButtons();
    },
    _buildForm: function() {
        if ( this.artifact ) { 
            this.planned_start_date = this.artifact.get('PlannedStartDate');
            this.planned_end_date = this.artifact.get('PlannedEndDate');
            this.last_update_date = this.artifact.get('LastUpdateDate');
            
            this.down('panel').add({
                xtype:'container',
                html: 'Last changed ' + Rally.util.DateTime.getDifference(new Date(), this.last_update_date,'day') + ' days ago'
            });
            
            this.down('panel').add({
                xtype:'rallydatefield',
                value: this.planned_start_date,
                fieldLabel: 'Planned Start Date',
                labelAlign: 'top',
                listeners: {
                    scope: this,
                    change: function(db, new_value) {
                        this.planned_start_date = new_value;
                    }
                }
            });
            
            this.down('panel').add({
                xtype:'rallydatefield',
                value: this.planned_end_date,
                fieldLabel: 'Planned End Date',
                labelAlign: 'top',
                listeners: {
                    scope: this,
                    change: function(db, new_value) {
                        this.planned_end_date = new_value;
                    }
                }
            });
        } else {
            this.down('panel').add({
                xtype:'container',
                html: 'Artifact not supplied'
            });
        }
        
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
                    text: 'Update',
                    scope: this,
                    userAction: 'clicked done in dialog',
                    handler: function() {
                        if ( this.planned_start_date > this.planned_end_date ) {
                            alert("The planned end date must be after the planned start date" );
                        } else {
                            this.fireEvent('updateClicked', this, this.artifact, this.planned_start_date, this.planned_end_date);
                            this.close();
                        }
                    }
                },
                {
                    xtype: 'rallybutton',
                    text: 'Cancel',
                    cls: 'secondary small',
                    handler: this.close,
                    scope: this,
                    ui: 'link'
                }
            ]
        });

    }
});