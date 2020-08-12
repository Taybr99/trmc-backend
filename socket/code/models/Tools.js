var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Tools = new Schema({
  groupName:String,
  userName:String,
  showchord:Boolean,
  showfret:Boolean,
}, {
  versionKey: false,
  
  toJSON: {
    virtuals: true,
    transform: function(doc, ret, options) {
      ret.id = ret._id.toHexString();
      delete ret._id;
    }
  },
  
  toObject: {
    virtuals: true
  }
});

mongoose.model('Tools', Tools);
