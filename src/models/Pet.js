import mongoose from "mongoose";

const petSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  breed: {
    type: String,
    required: true
  },
  sex:{
    type:String,
    required:true,
  },
  age: {
    type: Number,
    required: true
  },
  weight: {
    type:Number,
    required: true
  },
  image: {
        type: String,
    },
  description:{
        type: String,
        required: true
    },
    poster: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
},{timestamps: true});

const Pet = mongoose.model("Pet", petSchema);