require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 3000;

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;
const JWT_SECRET = process.env.JWT_SECRET;

app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
}));
app.use(express.json());

// JWT verification middleware
const verifyToken = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) return res.status(401).send({ message: 'Unauthorized: No token' });

    const token = authorization.split(' ')[1];
    if (!token) return res.status(401).send({ message: 'Unauthorized: Missing token' });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).send({ message: 'Forbidden: Invalid token' });
        req.token_email = decoded.email;
        next();
    });
};

app.get('/', (req, res) => res.status(200).send('TravelEase server running...'));

async function run() {
    try {
        const client = new MongoClient(uri, { serverApi: { version: ServerApiVersion.v1 } });
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db(dbName);
        const vehiclesCollection = db.collection('vehicles');
        const usersCollection = db.collection('users');
        const bookingCollection = db.collection('bookings');

        // ---------------- USERS ----------------
        app.post('/users', async (req, res) => {
            const newUser = req.body;
            const existingUser = await usersCollection.findOne({ email: newUser.email });
            if (existingUser) return res.status(200).send({ message: 'User already exists' });

            await usersCollection.insertOne(newUser);
            res.status(201).send({ message: 'User created successfully' });
        });

        app.post('/login', async (req, res) => {
            const { email } = req.body;
            const user = await usersCollection.findOne({ email });
            if (!user) return res.status(401).send({ error: 'User not found' });

            const token = jwt.sign({ email: user.email, id: user._id }, JWT_SECRET, { expiresIn: '1h' });
            res.send({ token });
        });

        // ---------------- VEHICLES ----------------
        app.get('/vehicles', async (req, res) => {
            const vehicles = await vehiclesCollection.find().sort({ createdAt: -1 }).limit(6).toArray();
            res.send(vehicles);
        });

        app.get('/vehicles/:id', async (req, res) => {
            const { id } = req.params;
            if (!ObjectId.isValid(id)) return res.status(400).send({ error: 'Invalid vehicle ID' });

            const vehicle = await vehiclesCollection.findOne({ _id: new ObjectId(id) });
            if (!vehicle) return res.status(404).send({ message: 'Vehicle not found' });

            res.send(vehicle);
        });

        app.get('/allVehicles', verifyToken, async (req, res) => {
            const allVehicles = await vehiclesCollection.find().sort({ createdAt: -1 }).toArray();
            res.send(allVehicles);
        });

        app.post('/vehicles', verifyToken, async (req, res) => {
            const vehicle = { ...req.body, createdAt: new Date() };
            const result = await vehiclesCollection.insertOne(vehicle);
            res.status(201).send({ message: 'Vehicle added successfully', insertedId: result.insertedId });
        });

        app.delete('/vehicles/:id', verifyToken, async (req, res) => {
            const { id } = req.params;
            if (!ObjectId.isValid(id)) return res.status(400).send({ error: 'Invalid vehicle ID' });

            const result = await vehiclesCollection.deleteOne({ _id: new ObjectId(id) });
            if (result.deletedCount === 0) return res.status(404).send({ error: 'Vehicle not found' });

            res.send({ message: 'Vehicle deleted successfully' });
        });

        // ---------------- BOOKINGS ----------------
        app.get('/bookings', verifyToken, async (req, res) => {
            const email = req.token_email;
            const bookings = await bookingCollection.find({ userEmail: email }).toArray();
            res.send(bookings);
        });

        app.post('/bookings', verifyToken, async (req, res) => {
            const booking = req.body;
            if (booking.userEmail !== req.token_email) {
                return res.status(403).send({ message: 'Forbidden: Cannot book for another user' });
            }

            const existing = await bookingCollection.findOne({ vehicleId: booking.vehicleId });
            if (existing) return res.status(400).send({ error: 'Vehicle already booked' });

            const result = await bookingCollection.insertOne(booking);
            res.send({ message: 'Booking saved successfully', bookingId: result.insertedId });
        });

        app.delete('/bookings/:id', verifyToken, async (req, res) => {
            const { id } = req.params;
            if (!ObjectId.isValid(id)) return res.status(400).send({ error: 'Invalid booking ID' });

            const result = await bookingCollection.deleteOne({ _id: new ObjectId(id) });
            if (result.deletedCount === 0) return res.status(404).send({ error: 'Booking not found' });

            res.send({ message: 'Booking canceled successfully' });
        });

    } catch (err) {
        console.error('MongoDB connection failed:', err);
    }
}
run().catch(console.dir);

app.listen(port, () => console.log(`Server running on port ${port}`));
