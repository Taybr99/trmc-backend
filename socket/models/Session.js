var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Session = new Schema({
  ip:String,
  systemIp:String,
  browser:String,
  user:{ type:String, ref: 'User'},
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

mongoose.model('Session', Session);
