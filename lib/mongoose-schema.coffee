
mongoose = require 'mongoose'
autoIncrement = require 'mongoose-auto-increment'

db = mongoose.createConnection "mongodb://127.0.0.1:27017/OJ"
Schema = mongoose.Schema

autoIncrement.initialize db


UserSchema = new Schema
  username: String
  password: String
  salt: String
  nickname: String
  email: String
  solved: [ type: String, ref: "Problem"]
  submit: [ type: String, ref: "Problem"]
  isAdmin: Boolean
  ip: String
  sault: String
  registTime: String


ProblemSchema = new Schema
  title: String
  description: String
  input: String
  output: String
  sampleInput: String
  sampleOutput: String
  judgeType: Number
  isHidden: Boolean

SolutionSchema = new Schema
  username: String
  problemId: Number
  #0: pending 1: compiling 2: running 3: compile error 4: runtime error 5: memory limit exceed 6: time limit exceed 7: output limit exceed 8: accept 9: Wrong answer 10: presentation error
  result: Number
  #内存使用
  memory: Number
  #运行时间
  time: Number
  codeLength: Number
  srcCode: String
  #ce info
  error: String

  submitTime: Number
  ip: String

ContestSchema = new Schema
  title: String
  isPrivate: Boolean
  isHidden: Boolean
  startTime: Number
  endTime: Number
  problemId: [Number]
  #private情况下,可访问的用户
  authorizee: [String]

#create index

UserSchema.index { username: "hashed" }, { unique: true }

ProblemSchema.index { problemId: 1}, { unique: true }

SolutionSchema.index { solutionId: -1 }
SolutionSchema.index { username: 1, problemId: 1, result: 1, contestId: 1, solutionId: -1 }
SolutionSchema.index { problemId: 1, result: 1, contestId: 1, solutionId: -1 }
SolutionSchema.index { result: 1, contestId: 1, solutionId: -1 }
SolutionSchema.index { contestId: 1, solutionId: -1 }

ContestSchema.index { startTime: -1 }
ContestSchema.index { contestId: "hashed" }


ProblemSchema.plugin autoIncrement.plugin, { model: "Problem", field: "problemId", startAt: 1000 }
SolutionSchema.plugin autoIncrement.plugin, { model: "Solution", field: "solutionId" }
ContestSchema.plugin autoIncrement.plugin, "Contest", { model: "Contest", field : "contestId" }

exports.User = db.model "User", UserSchema
exports.Problem = db.model "Problem", ProblemSchema
exports.Solution = db.model "Solution", SolutionSchema
exports.Contest = db.model "Contest", ContestSchema



db.once 'open', ->
  console.log "Mongo Open"
  return

db.on "erro", console.error.bind console, "Mongoose Connection error"
