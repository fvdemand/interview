import mongoose from 'mongoose';


const AiUsageSchema = new mongoose.Schema({
  caseId: {
    type: mongoose.Schema.Types.ObjectId
  },
  promptId: {
    type: String
  },
  promptVersion: {
    type: Number
  },
  inputTokens: {
    type: Number
  },
  outputTokens: {
    type: Number
  },
  jsonRetries: {
    type: Number,
    default: 0
  },
  jobId: {
    type: String
  },
  recordId: {
    type: String
  },
  modelId: {
    type: String
  },
  durationMs: {
    type: Number
  }
},{ timestamps: true });

export default AiUsageSchema;

