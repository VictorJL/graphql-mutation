
module.exports = {db : function(){
    var isProduction = process.env.DATABASE_URL ? true : false;

    var db = {};

    if(isProduction){
        // db Connection w/ Heroku
        db = require('knex')({
            client: 'pg',
            connection: {
            connectionString: process.env.DATABASE_URL || 
            "postgres://gjqlhvnhleneub:dd5149eb82a5b15ad13719f5a237e402d50e9d23e7c8ac72daf918f9381d22b6@ec2-54-204-35-248.compute-1.amazonaws.com:5432/d7mtiics2ervga",
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
            database : 'crud-starter-api'
            }
        });
    }
    return db;
}()};