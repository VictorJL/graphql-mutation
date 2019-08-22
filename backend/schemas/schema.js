var isProduction = process.env.DATABASE_URL ? true : false;

var db = {};

if(isProduction){
    // db Connection w/ Heroku
    db = require('knex')({
        client: 'pg',
        connection: {
        connectionString: process.env.DATABASE_URL,
        ssl: true,
        }
    });

} else{
    // db Connection w/ localhost
    db = require('knex')({
        client: 'pg',
        connection: {
        host : '127.0.0.1',
        user : 'postgres',
        password : 'postgres',
        database : 'graphql-mutation'
        }
    });
}

const { GraphQLSchema, GraphQLObjectType, GraphQLID, GraphQLString, GraphQLInt, GraphQLNonNull, GraphQLList } = require('graphql')

//Define User type
const userType = new GraphQLObjectType({
  name: 'User',
  type: 'Query',
  description: 'A user',
  fields: {
    id: {
      type: new GraphQLNonNull(GraphQLInt),
      description: 'The id of the user.',
    },
    username: {
      type: GraphQLString,
      description: 'The name of the user.'
    },
    password: {
      type: GraphQLString,
      description: 'The user password.'
    }
  }
});


const directorType = new GraphQLObjectType({
  name: 'Director',
  type: 'Query',
  description: 'A director',
  fields: {
    id: {
      type: new GraphQLNonNull(GraphQLInt),
      description: 'The director id.',
    },
    name: {
      type: GraphQLString,
      description: 'The name of the director.'
    },
    birthday: {
      type: GraphQLString,
      description: 'The director birthdate.'
    },

    country: {
      type: GraphQLString,
      description: 'The director country.',
    },

    actor_id: {
      type: GraphQLInt,
      description: 'The actor id this director is associated with'
    }

  }
})

const actorType = new GraphQLObjectType({
  name: 'Actor',
  type: 'Query',
  description: 'An actor',
  fields: {
    id: {
      type: new GraphQLNonNull(GraphQLInt),
      description: 'The actor id.',
    },
    name: {
      type: GraphQLString,
      description: 'The name of the actor.'
    },
    birthday: {
      type: GraphQLString,
      description: 'The actor birthdate.'
    },

    country: {
      type: GraphQLString,
      description: 'The actor country.',
    },

    movie_id: {
      type: GraphQLInt,
      description: 'The movie id this actor is associated with'
    },

    directors: {
      type: new GraphQLList(directorType),
      resolve: function(source, params){
          return db.select('*').from('directors').where('actor_id', source.id)
                   .then(items => {
                        if(items.length){
                            return items;
                        } else {
                            return { dataExists: 'false'};
                        }
                    })
                    .catch(err => console.log({dbError: 'db error'}))
      }

    }


  }
})


const movieType = new GraphQLObjectType({
  name: 'Movie',
  type: 'Query',
  description: 'A movie',
  fields: {
    id: {
      type: new GraphQLNonNull(GraphQLInt),
      description: 'The id of the movie.',
    },
    title: {
      type: GraphQLString,
      description: 'The title of the movie.'
    },
    year: {
      type: GraphQLString,
      description: 'The movie year.'
    },

    rating: {
      type: GraphQLString,
      description: 'The movie rating.',
    },

    actors: {
      type: new GraphQLList(actorType),
      resolve: function(source, params){
          return db.select('*').from('actors').where('movie_id', source.id)
                   .then(items => {
                        if(items.length){
                            return items;
                        } else {
                            return { dataExists: 'false'};
                        }
                    })
                    .catch(err => console.log({dbError: 'db error'}))
      }

    }
  }
})

// query
const query = new GraphQLObjectType({
    name: 'Query',
    type: 'Query',
    fields: {
      movies: {
        type: new GraphQLList(movieType),
        resolve: function(){
            return  db.select('*').from('movies')
                      .then(movies => {
                        if(movies.length){
                          return movies;
                        } else {
                          return { dataExists: 'false'};
                        }
                        })
                      //.then(movies => movies)
                      .catch(err => console.log({dbError: 'db error'}))
        }
      }
    }
});

const mutation = new GraphQLObjectType({
    name: 'Mutation',
    type: 'Mutation',
    fields: {
      createUser: {
            type: userType,
            args: {
                username: { type: GraphQLString },
                password: { type: GraphQLString }
            },
            resolve: function(parentValue, args){
                const { username, password } = args;

                const token = new Date();

                return db('users').insert({username, password})
                  .returning('*')
                  .then(items => {
                      return {
                        "token": token, 
                        "user": {
                          "id": items[0].id,
                          "name": items[0].username
                        }
                      };
                    })
                  .catch(function(err){
                    console.log(err);
                  });
            }
          },
      createMovie: {
            type: movieType,
            args: {
                title: { type: GraphQLString },
                year: { type: GraphQLString },
                rating: { type: GraphQLString }
            },
            resolve: function(parentValue, args){

                const { title, year, rating } = args;

                return db('movies').insert({title, year, rating})
                  .returning('*')
                  .then(movies => {
                      return movies[0];
                    })
                  .catch(function(err){
                    console.log(err);
                  });
            }
          },
          createActor: {
            type: actorType,
            args: {
                name: { type: GraphQLString },
                birthday: { type: GraphQLString },
                country: { type: GraphQLString },
                movie_id: { type: GraphQLInt }
            },
            resolve: function(parentValue, args){

                const { name, birthday, country, movie_id } = args;

                return db('actors').insert({name, birthday, country, movie_id})
                  .returning('*')
                  .then(actors => {
                      return actors[0];
                    })
                  .catch(function(err){
                    console.log(err);
                  });
            }
          },
          createDirector: {
            type: directorType,
            args: {
                name: { type: GraphQLString },
                birthday: { type: GraphQLString },
                country: { type: GraphQLString },
                actor_id: { type: GraphQLInt }
            },
            resolve: function(parentValue, args){

                const { name, birthday, country, actor_id } = args;

                return db('directors').insert({name, birthday, country, actor_id})
                  .returning('*')
                  .then(directors => {
                      return directors[0];
                    })
                  .catch(function(err){
                    console.log(err);
                  });
            }
          }
    }
});

//schema
const schema = new GraphQLSchema({
  query: query,
  mutation: mutation
})

module.exports = schema