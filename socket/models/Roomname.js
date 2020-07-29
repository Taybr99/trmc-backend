var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Roomname = new Schema({
  userName:String,
  password:String,
  admin:Boolean,
  groupName:String,
  publish:Boolean,
  otherUsers:Array,
  category:String,
  private:Boolean,
  paid:Boolean,
  showchord:Boolean,
  showfret:Boolean,
  showchordUser:String,
  showfretUser:String,
  email:String,
  roomAmount:String,
  transaction:Array,
  endDate:Date,
  startDate:Date,
  description:String,
  userWebsiteLink : String
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

mongoose.model('Roomname', Roomname);
