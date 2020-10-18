import express from "express";
import cors from "cors";
import mongoose from "mongoose";
const { Schema } = mongoose;
const { ObjectId } = mongoose.Types;

mongoose.connect(
  "mongodb+srv://tmuser:Dwp2v3hYAsdJKVpY@cluster0.ochku.mongodb.net/<dbname>?retryWrites=true&w=majority",
  { useNewUrlParser: true, useUnifiedTopology: true }
);

const app = express();
const port = 3000;

app.use(cors({ optionsSuccessStatus: 200 })); // some legacy browsers choke on 204

// http://expressjs.com/en/starter/static-files.html
app.use(express.static("public"));

app.set("trust proxy", true);

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

// your first API endpoint...
app.get("/api/hello", (req, res) => {
  res.json({ greeting: "hello API" });
});

/* TIMESTAMP MICROSERVICE */

const output = (date = new Date()) => ({
  unix: date.getTime(),
  utc: date.toUTCString(),
});

app.get("/api/timestamp/:date?", (req, res) => {
  const { date } = req.params;

  if (!date) {
    return res.json(output());
  }

  const parsedUtcDate = new Date(date);
  if (parsedUtcDate.toString() !== "Invalid Date") {
    return res.json(output(parsedUtcDate));
  }

  const numberRx = RegExp("^[0-9]+$");
  if (numberRx.test(date)) {
    return res.json(output(new Date(Number.parseInt(date))));
  }

  res.json({ error: "Invalid Date" });
});

/* HEADER PARSER MICROSERVICE */

app.get("/api/whoami", (req, res) => {
  res.json({
    ipaddress: req.ip,
    language: req.headers["accept-language"],
    software: req.headers["user-agent"],
  });
});

/* URL SHORTENER MICROSERVICE */

const Counter = mongoose.model(
  "Counter",
  new Schema({
    _id: { type: String, required: true },
    sequence_value: { type: Number, required: true },
  })
);

const counter = Counter.findById("urlId");
if (!counter)
  Counter.create({
    _id: "urlId",
    sequence_value: 0,
  });

const getNextSequenceValue = async () => {
  const updatedDoc = await Counter.findOneAndUpdate(
    { _id: "urlId" },
    { $inc: { sequence_value: 1 } },
    { new: true }
  ).exec();
  return updatedDoc.sequence_value;
};

const Url = mongoose.model(
  "Url",
  new Schema({
    _id: { type: Number, required: true },
    url: { type: String, required: true },
  })
);

const createAndSaveUrl = async (url) => {
  const _id = await getNextSequenceValue("urlId");
  const createdDoc = await Url.create({ _id, url });
  return createdDoc;
};

const findUrlById = async (id) => {
  try {
    const doc = await Url.findById(id);
    return doc.url;
  } catch (e) {
    console.log(e);
  }
};

const validURL = (str) =>
  !!new RegExp(
    "^(https?:\\/\\/)?" + // protocol
      "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" + // domain name
      "((\\d{1,3}\\.){3}\\d{1,3}))" + // OR ip (v4) address
      "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" + // port and path
      "(\\?[;&a-z\\d%_.~+=-]*)?" + // query string
      "(\\#[-a-z\\d_]*)?$", // fragment locator
    "i"
  ).test(str);

app.post("/api/shorturl/new", async (req, res) => {
  try {
    const url = decodeURIComponent(req.query.url);
    if (!validURL) {
      return res.json({ error: "Invalid URL" });
    }

    // Check to see if URL exists
    const found = await Url.findOne({ url });

    // If exists, return
    if (found) {
      res.json({ original_url: found.url, short_url: found._id });
    } else {
      // Else create
      const created = await createAndSaveUrl(url);
      res.json({ original_url: created.url, short_url: created._id });
    }
  } catch (e) {
    console.log(e);
  }
});

app.get("/api/shorturl/:id", async (req, res) => {
  try {
    const doc = await Url.findById(req.params.id);
    if (doc) res.redirect(doc.url);
  } catch (e) {
    console.log(e);
  }
});

/* EXERCISE TRACKER MICROSERVICE */

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

app.post("/api/exercise/new-user", async (req, res) => {
  try {
    const { username } = req.query;

    const userFound = await FitnessUser.findOne({ username }).exec();
    if (userFound)
      return res.json({
        error: `User with username '${username}' already exists!`,
      });

    const createdUser = await FitnessUser.create({ username });

    res.json({ _id: createdUser._id, username });
  } catch (error) {
    res.json({ error: error.message });
  }
});

app.get("/api/exercise/users", async (req, res) => {
  try {
    const users = await FitnessUser.find().select("username").exec();
    res.json(users);
  } catch (e) {
    console.log(e);
  }
});

app.post("/api/exercise/add", async (req, res) => {
  try {
    const { userId, description, duration, date = new Date() } = req.query;

    const userFound = await FitnessUser.findById(userId);
    if (!userFound) return res.json({ error: "Invalid user id" });
    const { username } = userFound;

    const created = await Exercise.create({
      userId,
      description,
      duration,
      date,
    });

    res.json({ _id: userId, username, date, duration, description });
  } catch (e) {
    console.log(e);
  }
});

app.get("/api/exercise/log", async (req, res) => {
  const { userId } = req.query;
  const from = req.query.from && new Date(req.query.from);
  const to = req.query.to && new Date(req.query.to + "T23:59:59.999Z");
  const limit = req.query.limit && Number.parseInt(req.query.limit);

  try {
    const userFound = await FitnessUser.findById(userId);
    if (!userFound) return res.json({ error: "Invalid user id" });
    const { username } = userFound;

    const query = Exercise.find({
      userId,
    }).select("-_id description duration date");

    if (from) query.where("date").gt(from);
    if (to) query.where("date").lt(to);
    if (limit) query.limit(limit);

    const results = await query.exec();
    console.log(results);

    res.json({
      _id: userId,
      username,
      count: results.length,
      log: results,
    });
  } catch (error) {
    console.log(error);
  }
});

// listen for requests :)
const listener = app.listen(port, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
