//  IMPORTING THE REQUIRED FILE DIRECTORIES IN THE WORK SPACE 
import mongoose from 'mongoose';

// CREATING THE USER SCHEMA FOR THE TELEGRAM ID
const userSchema = mongoose.Schema({
      telegramID: {
            type: String,
            required: true,
            unique: true
      },

      firstName: {
            type: String,
            required: true
      },

      lastName: {
            type: String,
            required: true
      },

      isBot: {
            type: Boolean,
            required: true
      },

      userName: {
            type: String,
            required: true,
            unique: true
      },

      promptTokens: {
            type: Number,
            required: false
      },

      completionTokens: {
            type: Number,
            required: false
      },
}, {timestamps: true});


//  EXPORTING THE MODULE
export default mongoose.model('User', userSchema);