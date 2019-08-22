const express = require('express');
const graphqlHTTP = require('express-graphql');
const { buildSchema } = require('graphql');

// use process.env variables to keep private variables,
// be sure to ignore the .env file in github
require('dotenv').config();

// Express Middleware
const helmet = require('helmet'); // creates headers that protect from attacks (security)
const bodyParser = require('body-parser'); // turns response into usable format
const cors = require('cors');  // allows/disallows cross-site communication
const morgan = require('morgan'); // logs requests
const cookieParser = require("cookie-parser");

// App
const app = express();

// Schema
const schema = require('./schemas/schema');

app.use(helmet());
app.use(cors());
app.use(cookieParser());
app.options('*', cors());
app.use(bodyParser.json());
app.use(morgan('combined')); // use 'tiny' or 'combined'

app.use('/graphql', graphqlHTTP((request, response, graphQLParams) => ({
  schema: schema,
  graphiql: true,
  context: { 
    request: request,
    response: response
  }
})));

// App Server Connection
app.listen(process.env.PORT || 5000, () => {
  console.log(`app is running on port ${process.env.PORT || 5000}`)
});