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

        //database and collection
        const db = client.db(dbName);
        const vehiclesCollection = db.collection('vehicles');

        const usersCollection = db.collection('users');

        const bookingCollection = db.collection('bookings');

        // users API

        app.post('/users', async (req, res) => {
            const newUser = req.body;
            const email = newUser.email;
            const query = { email: email };

            const existingUser = await usersCollection.findOne(query);

            if (existingUser) {
                res.send({ message: 'user already exist in the db' });

            } else {
                const result = await usersCollection.insertOne(newUser);
                res.send(result);

            }
        })


        //  POST route to add vehicle data with created_at field
        app.get('/allVehicles/:id', async (req, res) => {
            try {
                const { id } = req.params;
                let query;

                if (ObjectId.isValid(id)) {
                    query = { _id: new ObjectId(id) };
                } else {
                    query = { _id: id }; // fallback if it’s stored as string
                }

                const vehicle = await vehiclesCollection.findOne(query);
                if (!vehicle) {
                    return res.status(404).send({ message: 'Vehicle not found' });
                }

                res.send(vehicle);
            } catch (err) {
                console.error('Error fetching vehicle:', err);
                res.status(500).send({ error: 'Failed to fetch vehicle' });
            }
        });



        // gettin sort and 6 vehicle data
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

        // allVehicles api
        app.get('/allVehicles', async (req, res) => {
            try {
                const allVehicles = await vehiclesCollection.find().sort({ created_at: -1 }).toArray();

                res.send(allVehicles);

            } catch (err) {
                console.error('Error fetching allVehicle', err);
                res.status(500).send({ err: 'failed to fetch allVehicles data' })
            }
        })


        app.post('/vehicles', async (req, res) => {
            try {
                const vehicle = {
                    ...req.body,
                    created_at: new Date(),
                };

                const result = await vehiclesCollection.insertOne(vehicle);

                res.status(201).send({
                    message: 'Vehicle added successfully',
                    insertedId: result.insertedId,
                });
            } catch (err) {
                console.error('Error inserting vehicle:', err);
                res.status(500).send({ error: 'Failed to insert vehicle data' });
            }
        });

        app.delete('/vehicles/:id', async (req, res) => {
            try {
                const { id } = req.params;

                if (!ObjectId.isValid(id)) {
                    return res.status(400).send({ error: 'Invalid vehicle ID' });
                }

                const result = await vehiclesCollection.deleteOne({ _id: new ObjectId(id) });

                if (result.deletedCount === 0) {
                    return res.status(404).send({ error: 'Vehicle not found' });
                }

                res.send({ message: 'Vehicle deleted successfully' });
            } catch (err) {
                console.error('Failed to delete vehicle:', err);
                res.status(500).send({ error: 'Failed to delete vehicle' });
            }
        });

        // update related api

        app.put('/vehicles/:id', async (req, res) => {
            const { id } = req.params;
            const updatedData = req.body;
            try {
                const result = await vehiclesCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: updatedData }
                );
                if (result.modifiedCount === 1) {
                    res.send({ message: "Vehicle updated successfully" });
                } else {
                    res.status(400).send({ error: "No changes made or invalid ID" });
                }
            } catch (err) {
                console.error(err);
                res.status(500).send({ error: "Failed to update vehicle" });
            }
        });



        // single vehicles api
        const { ObjectId } = require('mongodb');

        app.get('/allVehicles/:id', async (req, res) => {
            try {
                const { id } = req.params;

                if (!ObjectId.isValid(id)) {
                    return res.status(400).send({ error: 'Invalid vehicle ID' });
                }

                const vehicle = await vehiclesCollection.findOne({ _id: new ObjectId(id) });
                if (!vehicle) {
                    return res.status(404).send({ message: 'Vehicle not found' });
                }

                res.send(vehicle);
            } catch (err) {
                console.error('Error fetching vehicle:', err);
                res.status(500).send({ error: 'Failed to fetch vehicle' });
            }
        });

        // booking related api

        app.post('/bookings', async (req, res) => {
            try {
                const booking = req.body;

                const existing = await bookingCollection.findOne({
                    vehicleId: booking.vehicleId,
                    userEmail: booking.userEmail
                });

                if (existing) {
                    return res.status(400).send({ error: 'You already booked this vehicle' })
                }
                const result = await bookingCollection.insertOne(booking);
                res.send({ message: 'Booking saved successfully', bookingId: result.insertedId });
            } catch (err) {
                console.error('Booking failed,', err);
                res.status(500).send({ error: 'Booking failed' });
            }
        });

        app.get('/bookings', async (req, res) => {
            try {
                const bookings = await bookingCollection.find().toArray();
                res.send(bookings);
            } catch (err) {
                console.error('Failed to fetch bookings:', err);
                res.status(500).send({ error: 'Failed to fetch bookings' });
            }
        });


        app.delete('/bookings/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const result = await bookingCollection.deleteOne({ _id: new ObjectId(id) });

                if (result.deletedCount === 0) {
                    return res.status(404).send({ error: 'Booking not found' });
                }

                res.send({ message: 'Booking canceled successfully' });
            } catch (err) {
                console.error('Failed to delete booking:', err);
                res.status(500).send({ error: 'Failed to cancel booking' });
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
