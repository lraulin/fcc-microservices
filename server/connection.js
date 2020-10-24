require("dotenv").config();
const mongoose = require("mongoose");
const { Schema } = mongoose;
const { ObjectId } = mongoose.Types;

async function main(callback) {
  const URI = process.env.MONGO_URI; // Declare MONGO_URI in your .env file

  try {
    mongoose.connect(URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const User = mongoose.model(
      "User",
      new Schema({
        username: { type: String, required: true },
        password: { type: String, required: true },
        role: { type: String },
      })
    );

    const Counter = mongoose.model(
      "Counter",
      new Schema({
        _id: { type: String, required: true },
        sequence_value: { type: Number, required: true },
      })
    );

    const Url = mongoose.model(
      "Url",
      new Schema({
        _id: { type: Number, required: true },
        url: { type: String, required: true },
      })
    );

    const FitnessUser = mongoose.model(
      "FitnessUser",
      new Schema({
        username: { type: String, required: true, unique: true },
      })
    );

    const Exercise = mongoose.model(
      "Exercise",
      new Schema({
        userId: { type: ObjectId, required: true },
        description: { type: String, required: true },
        duration: { type: Number, required: true },
        date: { type: Date, required: true },
      })
    );

    await callback({ User, Counter, Url, FitnessUser, Exercise });
  } catch (e) {
    console.error(e);
    throw new Error("Unable to Connect to Database");
  }
}

module.exports = main;
