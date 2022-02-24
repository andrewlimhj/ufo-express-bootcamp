import express from 'express';
import methodOverride from 'method-override';
import cookieParser from 'cookie-parser';
import moment from 'moment';
import {
  add, read, write, deleteEntry,
} from './jsonFileStorage.js';

// start express server
const app = express();
// add EJS as the view engine
app.set('view engine', 'ejs');

// Configure Express to parse request body data into request.body
app.use(express.urlencoded({ extended: false }));

// Override POST requests with query param ?_method=PUT to be PUT requests
app.use(methodOverride('_method'));

app.use(cookieParser());

const dataValidation = (input) => {
  if (input.text === '' || input.city === '' || input.shape === '' || input.date_time === '' || input.state === '' || input.duration === '' || input.summary === '') {
    console.log('false');
    return false;
  }
};

// Render the form to input new sightings
app.get('/sighting', (request, response) => {
  response.render('sighting-form');
});

// Accept a POST request to create a new sighting
app.post('/sighting', (request, response) => {
  let date = request.body.date_time;
  if (dataValidation(request.body) === false) {
    response.send('error');
    console.log('error');
  }

  if (date) {
    date = moment().format('dddd, MMMM Do YYYY, h:mm:ss a');
    console.log(date);
  } else {
    add('data.json', 'sightings', request.body, (err) => {
      if (err) {
        response.status(500).send('DB write error');
        return;
      }
      response.redirect('/');
    });
  }
});

// Render a single sighting
const getSighting = (request, response) => {
  read('data.json', (err, data) => {
    const { index } = request.params;
    const sighting = data.sightings[index];
    response.render('sighting', sighting);
  });
};

app.get('/sighting/:index', getSighting);

// Render a list of sightings
const getSightings = (request, response) => {
  read('data.json', (err, data) => {
    let sightingData = data.sightings;
    let sortBy = 'Default';

    let visits = 0;

    // check if it's not the first time a request has been made
    if (request.cookies.visits) {
      visits = Number(request.cookies.visits); // get the value from the request
    }

    // set a new value of the cookie
    visits += 1;

    response.cookie('visits', visits); // set a new value to send back

    const availableQueries = [
      'Date and Time',
      'City',
      'State',
      'Shape',
      'Duration',
      'Summary',
    ];

    sightingData = sightingData.map((sighting, index) => ({
      ...sighting,
      index,
    }));

    if (Object.keys(request.query).length > 0) {
      sortBy = request.query.sortBy;

      const sortKey = sortBy.toLowerCase().replace('date and time', 'date_time');

      // eslint-disable-next-line max-len
      // const filteredSightingData = sightingData.filter((sighting) => Object.values(sighting).every((value) => value));

      console.log(sortKey);

      sightingData = sightingData.sort((a, b) => (b[sortKey] > a[sortKey] ? 1 : -1));
      console.log(sightingData);
    }

    response.render('sightings', {
      sightings: sightingData,
      queries: availableQueries,
      sortBy,
      visits,
    });
  });
};

app.get('/', getSightings);

// Render a form to edit a sighting
app.get('/sighting/:index/edit', (request, response) => {
  // Retrieve current recipe data and render it
  read('data.json', (err, data) => {
    const { index } = request.params;
    const sighting = data.sightings[index];
    // Pass the recipe index to the edit form for the PUT request URL.
    sighting.index = index;
    const ejsData = { sighting };
    // console.log(ejsData);
    response.render('edit', ejsData);
  });
});

// Update sighting details based on form
app.put('/sighting/:index', (request, response) => {
  const { index } = request.params;
  read('data.json', (err, data) => {
    // Replace the data in the object at the given index
    data.sightings[index] = request.body;
    write('data.json', data, (err) => {
      response.send('Done!');
    });
  });
});

// Accept a request to delete a sighting
app.delete('/sighting/:index', (request, response) => {
  // Remove element from DB at given index
  const { index } = request.params;

  deleteEntry('data.json', index);
  response.redirect('/');
});

// Render a list of sighting shapes
const getShapes = (request, response) => {
  read('data.json', (err, data) => {
    const { sightings } = data;
    const shapes = [];

    const filteredShapes = sightings.filter((row) => row.shape);

    const sortedShapes = filteredShapes
      .map((row) => row.shape)
      .sort((a, b) => b - a);

    sortedShapes.forEach((shape) => {
      if (!shapes.includes(shape)) {
        shapes.push(shape);
      }
    });

    response.render('shapes', { shapes });
  });
};

app.get('/shapes', getShapes);

// Render a list of sightings that has one shape
const getShape = (request, response) => {
  read('data.json', (err, data) => {
    const { sightings } = data;
    const { shape } = request.params;

    response.render('shape-sightings', { sightings, shape });
  });
};

app.get('/shapes/:shape', getShape);

// Get favorites
app.get('/favorites/:index', (request, response) => {
  // get the index where cookie is going to be set
  const favIndex = request.params.index; // eg. 3
  // check the current req.cookies.favIndex is empty or no, then set cookie as yes
  if (!request.cookies[favIndex] || request.cookies[favIndex] === 'no') {
    response.cookie(favIndex, 'yes'); // eg {'3':yes}
  }
  // vice versa
  if (request.cookies[favIndex] === 'yes') {
    response.cookie(favIndex, 'no'); // eg {'3':no}
  }

  // send response so cookie will be set
  response.sendStatus(200);
  // console.log (req.cookies);
});

// listen to port
app.listen(80);
