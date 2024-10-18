const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const { connectToDB } = require("./connect");
const userRouter = require("./routes/user");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: "*",
    exposedHeaders: ["X-token", "name"],
  })
);
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Logging the requests.
app.use((req, res, next) => {
  let log = `\n${req.method} ${req.url} ${new Date().toISOString()}`;
  fs.appendFile("./log.txt", log, (err) => {
    if (err) {
      console.log(err);
    }
  });
  next();
});

app.use("/auth", userRouter);

// Handling server error.
app.use((err, req, res, next) => {
  let log =
    `\n${req.method} ${req.url} ${new Date().toISOString()}\n` + err.stack;
  fs.appendFile("./error.txt", log, (err) => {
    if (err) {
      console.log(err);
    }
  });

  res.status(500).json({ msg: "Something went wrong on server!!", err });
});

// Connecting to DB and listening to server specified port.
connectToDB(process.env.MONGO)
  .then(() => {
    console.log("Connected to DB.");
    app.listen(PORT, (err) => {
      if (err) console.log(err);
      else console.log(`Server is up on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.log(err);
  });
