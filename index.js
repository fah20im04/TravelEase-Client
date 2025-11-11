require('dotenv').config(); // Load environment variables

const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();
const port = process.env.PORT || 3000;

// Load sensitive data from .env
const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

// Middleware
app.use(cors());
app.use(express.json());

// Root route
app.get('/', (req, res) => {
    res.status(200).send('TravelEase server is running securely...');
});

async function run() {
    try {
        // Connect to MongoDB
        const client = new MongoClient(uri, {
            serverApi: {
                version: ServerApiVersion.v1,
                strict: true,
                deprecationErrors: true,
            },
        });

        await client.connect();
        console.log(' Connected to MongoDB securely');

        // Select database and collection
        const db = client.db(dbName);
        const vehiclesCollection = db.collection('vehicles');

        const usersCollection = db.collection('users');

        // users API

        app.post('/users', async (req, res) => {
            const newUser = req.body;
            const email = newUser.email;
            const query = {email: email};

            const existingUser  = await usersCollection.findOne(query);

            if(existingUser){
                res.send({message: 'user already exist in the db'});

            }else{
                const result = await usersCollection.insertOne(newUser);
                res.send(result);
                
            }
        })


        //  POST route to add vehicle data with created_at field
        app.post('/vehicles', async (req, res) => {
            try {
                const vehicle = {
                    ...req.body,
                    created_at: new Date(),
                };
                const result = await vehiclesCollection.insertOne(vehicle);
                res.status(201).send({
                    message: ' Vehicle added successfully',
                    insertedId: result.insertedId,
                });
            } catch (error) {
                console.error(' Error inserting vehicle:', error);
                res.status(500).send({ error: 'Failed to insert vehicle data' });
            }
        });

        //GET route → get latest 6 vehicles sorted by created_at
        app.get('/vehicles', async (req, res) => {
            try {
                const vehicles = await vehiclesCollection
                    .find()
                    .sort({ created_at: -1 })
                    .limit(6)
                    .toArray();
                res.send(vehicles);
            } catch (error) {
                console.error(' Error fetching vehicles:', error);
                res.status(500).send({ error: 'Failed to fetch vehicles' });
            }
        });

    } catch (err) {
        console.error(' MongoDB connection failed:', err);
    }
}

run().catch(console.dir);

// Start server
app.listen(port, () => {
    console.log(` TravelEase server is running securely on port: ${port}`);
});
