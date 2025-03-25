import mongoose from "mongoose";

const playdateSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  image: {
    type: String,
  },

  attractions: {
    type: [String],
    default: [],

  },
  date: {
    type: Date,
    required: true
  },
  access: {
    type: String,
    required: true
  },

  location: {
    type: String,
    required: true
  },
  poster: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
},{timestamps: true});

const Playdate = mongoose.model("Playdate", playdateSchema);

export default Playdate;