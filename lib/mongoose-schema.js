var ContestSchema, ProblemSchema, Schema, SolutionSchema, UserSchema, autoIncrement, db, mongoose;

mongoose = require('mongoose');

autoIncrement = require('mongoose-auto-increment');

db = mongoose.createConnection("mongodb://127.0.0.1:27017/OJ");

Schema = mongoose.Schema;

autoIncrement.initialize(db);

UserSchema = new Schema({
  username: String,
  password: String,
  salt: String,
  nickname: String,
  email: String,
  solved: {
    type: [Number],
    "default": []
  },
  submit: {
    type: [Number],
    "default": []
  },
  isAdmin: {
    type: Boolean,
    "default": false
  },
  ip: String,
  registTime: String
});

ProblemSchema = new Schema({
  title: String,
  description: String,
  input: String,
  output: String,
  sampleInput: String,
  sampleOutput: String,
  judgeType: Number,
  isHidden: Boolean,
  memLimit: Number,
  timeLimit: Number,
  solvedNum: {
    type: Number,
    "default": 0
  }
});

SolutionSchema = new Schema({
  username: String,
  problemId: Number,
  result: Number,
  memory: Number,
  time: Number,
  codeLength: Number,
  srcCode: String,
  error: String,
  contestId: Number,
  submitTime: Number,
  ip: String
});

ContestSchema = new Schema({
  title: String,
  isPrivate: Boolean,
  isHidden: Boolean,
  startTime: Number,
  endTime: Number,
  problems: {
    type: [ProblemSchema],
    "default": []
  },
  authorizee: {
    type: [String],
    "default": []
  }
});

UserSchema.index({
  username: "hashed"
});

ProblemSchema.index({
  problemId: 1
}, {
  unique: true
});

SolutionSchema.index({
  username: 1,
  problemId: 1,
  result: 1,
  contestId: 1,
  solutionId: -1
});

SolutionSchema.index({
  problemId: 1,
  result: 1,
  contestId: 1,
  solutionId: -1
});

SolutionSchema.index({
  result: 1,
  contestId: 1,
  solutionId: -1
});

SolutionSchema.index({
  contestId: 1,
  solutionId: -1
});

SolutionSchema.index({
  solutionId: -1
}, {
  unique: true
});

ContestSchema.index({
  startTime: -1
});

ContestSchema.index({
  contestId: "hashed"
});

ProblemSchema.plugin(autoIncrement.plugin, {
  model: "Problem",
  field: "problemId",
  startAt: 1000
});

SolutionSchema.plugin(autoIncrement.plugin, {
  model: "Solution",
  field: "solutionId",
  startAt: 1
});

ContestSchema.plugin(autoIncrement.plugin, {
  model: "Contest",
  field: "contestId",
  startAt: 1
});

exports.User = db.model("User", UserSchema);

exports.Problem = db.model("Problem", ProblemSchema);

exports.Solution = db.model("Solution", SolutionSchema);

exports.Contest = db.model("Contest", ContestSchema);

db.once('open', function() {
  console.log("Mongo Open");
});

db.on("erro", console.error.bind(console, "Mongoose Connection error"));
