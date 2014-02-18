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
            context: me.getContext()
        });
    }
});
