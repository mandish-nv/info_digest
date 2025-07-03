const mongoose=require('mongoose')

const userSchema =new mongoose.Schema({
  fullName:{
    type:String,
    required:true
  },
  userName:{
    type:String,
    required:true
  },
  gender:{
    type:String,
    required:true
  },
  dob:{
    type: Date,
    required:true
  },
  email:{
    type: String,
    required:true
  },
  password:{
    type:String,
    required:true
  },
  profilePicture:{
    type:String,
    default: null,
    required:false
  },
  adminAccess:{
    type:Boolean,
    default: false
  },
}, {timestamps: true})

module.exports = mongoose.model("User", userSchema);