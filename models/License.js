var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var License = new Schema({
  macAddress:String,
  endDate:Date,
  createdDate:Date,
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

mongoose.model('License', License);
