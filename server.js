// Express
const express = require('express');
const engines = require('consolidate');
const helper = require('./functions/helper');
const pjson = require('./package.json');
const config = require('./config.json');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const path = require('path');
const app = express();

// Consts are set from environment if not set, the default values are used
const SERVERURL = process.env.SERVER_URL || 'localhost';
const SERVERPORT = process.env.SERVER_PORT || 3000;
const EXTPORT = process.env.SERVER_EXT || 3000;

const REDISURL = process.env.REDIS_URL || config.redishost;
const REDISPORT = process.env.REDIS_PORT || config.redisport;

// Configure the service
app.use(express.static(path.join(__dirname, 'static')));
app.use(morgan('combined'));
app.set('views', __dirname + '/static');
app.engine('html', engines.mustache);
app.set('view engine', 'html');
app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
}));


// Datastore
// Create a new redis Client
let redis = require('redis');
let client = redis.createClient(REDISPORT, REDISURL);
let jsonParser = bodyParser.json()


client.on('connect', function () {
    console.log('Redis client connected to Redis Server on [' + REDISURL + ':' + REDISPORT + ']');
});

client.on('error', function (err) {
    console.log('Something went wrong [' + REDISURL + ':' + REDISPORT + '] ' + err);
});


// Homepage
app.get('/', (req, res) => {
    res.render("static/index.html");
});

// Liveness and Health Probes
app.get('/liveness', (req, res) => {
    res.json({
        "app": {
            "version": pjson.version,
            "name": pjson.name,
            "description": pjson.description
        }
    });
});

app.get('/health', (req, res) => {
    res.json({"status": "UP"});
});

// POST
app.post('/assets', jsonParser, (req, res) => {
    let data = req.body;
    if (data === undefined || data === "" || data === null) {
        console.log("Aint no data buddy");
        res.render('404', {});
    }
    client.get(data.customer.id, (err, value) => {

        if (err) {
            client.set(data.customer.id, data, redis.print);
        } else {
            client.del(data.customer.id);
            client.set(data.customer.id, data, redis.print);
        }
    });
    res.json({
        'result': 'added'
    });
});


app.get('/generateCustomerId', (req, res) => {
    res.json({
        "id": helper.id()
    });
});

// print the application Head
helper.printHead();

// Listener
app.listen(SERVERPORT, () => console.log(`server started on http://${SERVERURL}:${EXTPORT}`));