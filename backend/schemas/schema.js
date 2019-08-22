const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { APP_SECRET, getUserId } = require('../utils')

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

const sessionType = new GraphQLObjectType({
  name: 'Session',
  type: 'Query',
  description: 'A session',
  fields: {

    token: {
      type: GraphQLString,
      description: 'The session token.'
    },
    user: {
      type: userType,
      description: 'The session user.'
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

    scoutbase_rating: {
      type: GraphQLString,
      resolve: function(source, params, context, info){

        const userId = getUserId(context)

        if(userId !== null){
          return db.select('*').from('users').where('id', userId)
                   .then(items => {
                        if(items.length){
                            return (Math.floor(Math.random() * (9 - 5 + 1)) + 5).toString();
                        } else {
                            return "";
                        }
                    })
                    .catch(err => console.log({dbError: 'db error'}))
        }

      }
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
            type: sessionType,
            args: {
                username: { type: GraphQLString },
                password: { type: GraphQLString }
            },
            resolve: async function(parentValue, args, context, info){
                const { username } = args;

                const password = await bcrypt.hash(args.password, 10)


                return db('users').insert({username, password})
                  .returning('*')
                  .then(users => {

                      const token = jwt.sign({ userId: users[0].id }, APP_SECRET)
                      const user = users[0];

                      //context.request.headers.authorization = token

                      context.response.cookie('token', token, { maxAge: 1000 * 60 * 1, httpOnly: true });

                      return {
                        token,
                        user
                      };
                    })
                  .catch(function(err){
                    console.log(err);
                  });
            }
          },
          login: {
            type: sessionType,
            args: {
                username: { type: GraphQLString },
                password: { type: GraphQLString }
            },
            resolve: async function(parentValue, args, context, info){
                const { username } = args;


                return db.select('*').from('users').where('username', username)
                .then(async users =>  {
                     if(users.length){

                        const user = users[0];

                        const valid = await bcrypt.compare(args.password, user.password)
                        
                        if (!valid) {
                          context.request.headers.authorization = null;
                          return {};
                        }

                        const token = jwt.sign({ userId: user.id }, APP_SECRET)

                        //context.request.headers.authorization = token

                        context.response.cookie('token', token, { maxAge: 1000 * 60 * 1, httpOnly: true });

                        return {
                          token,
                          user
                        };

                     } else {
                         return { dataExists: 'false'};
                     }
                 })
                 .catch(err => console.log({dbError: 'db error'}))
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