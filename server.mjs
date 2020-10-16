import express from "express";
import cors from "cors";

const app = express();
const port = 3000;

app.use(cors({ optionsSuccessStatus: 200 })); // some legacy browsers choke on 204

// http://expressjs.com/en/starter/static-files.html
app.use(express.static("public"));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

// your first API endpoint...
app.get("/api/hello", (req, res) => {
  res.json({ greeting: "hello API" });
});

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

// listen for requests :)
const listener = app.listen(port, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
