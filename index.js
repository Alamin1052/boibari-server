const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 3000

const admin = require("firebase-admin");

const serviceAccount = require("./boibari-user-firebase-adminsdk.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

app.use(cors());
app.use(express.json());

const verifyFireBaseToken = async (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ message: 'unauthorized access' })
    }
    const token = authorization.split(' ')[1];

    try {
        const decoded = await admin.auth().verifyIdToken(token);
        console.log('inside token', decoded)
        req.token_email = decoded.email;
        next();
    }
    catch (error) {
        return res.status(401).send({ message: 'unauthorized access' })
    }
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tmeirwi.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const db = client.db('boibari-db');
        const booksCollection = db.collection('books');
        const commentsCollection = db.collection("comment")

        // POST comment
        app.post("/comments", async (req, res) => {
            const comment = req.body;
            const result = await commentsCollection.insertOne(comment);
            res.send(result);
        });

        // GET comments by bookId
        app.get("/comments/:bookId", async (req, res) => {
            const bookId = req.params.bookId;
            const result = await commentsCollection
                .find({ bookId })
                .sort({ createdAt: -1 })
                .toArray();
            res.send(result);
        });


        // GET Books
        app.get("/all-books", async (req, res) => {
            const result = await booksCollection.find().toArray();
            res.send(result);
        });

        // Get bookDetails by id
        app.get("/book-details/:id", async (req, res) => {
            const { id } = req.params;
            const objectId = new ObjectId(id);

            const result = await booksCollection.findOne({ _id: objectId });

            res.send({
                success: true,
                result,
            });
        });

        // Add book 
        app.post("/add-book", verifyFireBaseToken, async (req, res) => {
            const data = req.body;
            // console.log(data)
            const result = await booksCollection.insertOne(data);
            res.send({
                success: true,
                result,
            });
        });

        // Update book 
        app.put("/update-book/:id", verifyFireBaseToken, async (req, res) => {
            const { id } = req.params;
            const data = req.body;
            // console.log(id)
            // console.log(data)
            const objectId = new ObjectId(id);
            const filter = { _id: objectId };
            const update = {
                $set: data,
            };

            const result = await booksCollection.updateOne(filter, update);

            res.send({
                success: true,
                result,
            });
        });

        // Delete book
        app.delete("/books/:id", async (req, res) => {
            const { id } = req.params;
            const objectId = new ObjectId(id)
            const filter = { _id: objectId }
            const result = await booksCollection.deleteOne(filter);

            res.send({
                success: true,
                result,
            });
        });

        app.get("/my-books", verifyFireBaseToken, async (req, res) => {
            const email = req.query.email
            const result = await booksCollection.find({ userEmail: email }).toArray()
            res.send(result)
        });

        app.get("/latest-books", async (req, res) => {
            const result = await booksCollection
                .find()
                .sort({ created_at: "desc" })
                .limit(6)
                .toArray();

            console.log(result);

            res.send(result);
        });


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get("/", (req, res) => {
    res.send("Server is running good");
});

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});