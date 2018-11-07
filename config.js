const { Pool, Client } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'noteTODO',
    password: '160893lvP102',
    port: 5432
});
// pool.end();

const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'noteTODO',
    password: '160893lvP102',
    port: 5432
})
client.connect();

const facebook = {
    clientID: '364447510964913',
    clientSecret: 'bfa214522a00d3d91c204096ecce12a8',
    callbackURL: 'http://localhost:3000/auth/facebook/cb'
}

const google = {
    clientID: '476381393650-9i6rsn2jsqo07nckfsergdavar0j6qao.apps.googleusercontent.com',
    clientSecret: 'X-gj4qEUtNZcoIf1oToHO2Td',
    callbackURL: 'http://localhost:3000/auth/google/cb'
}

const github = {
    clientID: '0f0219ce7ce533441aa0',
    clientSecret: '1a75a46b2f60189e779dc2469d7310e740cc5b74',
    callbackURL: 'http://localhost:3000/auth/github/cb'
}

module.exports = {
    pool: pool,
    client: client,
    facebook: facebook,
    google: google,
    github: github
};