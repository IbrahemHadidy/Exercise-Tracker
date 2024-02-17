const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

// Load environment variables from .env file
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// Define Mongoose schema and model for users and exercises
const { Schema } = mongoose;

const exerciseSchema = new Schema({
  description: String,
  duration: Number,
  date: String
});

const userSchema = new Schema({
  username: String,
  log: [exerciseSchema]
});

const User = mongoose.model('User', userSchema);

// Middleware
app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve HTML file for the root path
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// Route handler to create a new user
app.post('/api/users', async (req, res) => {
  try {
    const { username } = req.body;

    // Check if username is provided
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    // Create a new user
    const newUser = new User({ username });
    await newUser.save();

    res.json({ username: newUser.username, _id: newUser._id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Route handler to get all users data
app.get('/api/users', async (req, res) => {
  try {
    // Fetch all users from the database
    const users = await User.find();
    
    // Send the users data as a response
    res.json(users);
  } catch(err) {
    console.error(err); // Log the error
    res.status(500).json({ error: 'Server error' }); // Send an error response
  }
});

// Route handler to add exercises to a user's log
app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const { _id } = req.params;
    const { description, duration, date } = req.body;

    // Find the user by ID
    let user = await User.findById(_id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Add exercise to the user's log
    const newExercise = { description, duration, date: date || new Date()};
    user.log.push(newExercise);
    await user.save();

    // Return the updated user object with added exercise
    res.json({
      username: user.username,
      description: newExercise.description,
      duration: parseInt(newExercise.duration),
      date: new Date(newExercise.date).toDateString(),
      _id: _id
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Route handler to retrieve a user's exercise log
app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const { _id } = req.params;
    const { from, to, limit } = req.query;

    // Find the user by ID
    const user = await User.findById(_id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let log = user.log;

    // Filter exercises by date range if 'from' and 'to' query parameters are provided
    if (from && to) {
      log = log.filter(exercise => {
        const exerciseDate = new Date(exercise.date);
        const fromDate = new Date(from);
        const toDate = new Date(to);
        return exerciseDate >= fromDate && exerciseDate <= toDate;
      });
    }

    // Limit the number of exercises if 'limit' query parameter is provided
    if (limit) {
      log = log.slice(0, parseInt(limit));
    }

    res.json({
      _id: user._id,
      username: user.username,
      count: log.length,
      log: log.map(exercise => ({
        description: exercise.description,
        duration: exercise.duration,
        date: new Date(exercise.date).toDateString()
      }))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});


// Start the server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
