var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Video = new Schema({
  // groupName:String,
  // userName:{ type : Array , "default" : [] }
  videoUrl:String,
  roomName:String,
  date:String,
}
, {
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

mongoose.model('Video', Video);
