const express = require('express')
const app = express()
require('dotenv').config()
const cors = require('cors')
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
const jwt = require('jsonwebtoken')

const port = process.env.PORT || 8000


// middleware
const corsOptions = {
  origin: ['http://localhost:5173', 'https://simple-firebase-e56ea.web.app','https://simple-firebase-e56ea.firebaseapp.com'],
  credentials: true,
  optionSuccessStatus: 200,
}

// simple-firebase

app.use(cors(corsOptions))

app.use(express.json())
app.use(cookieParser())

// Verify Token Middleware
const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token
  console.log(token)
  if (!token) {
    return res.status(401).send({ message: 'unauthorized access' })
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.log(err)
      return res.status(401).send({ message: 'unauthorized access' })
    }
    req.user = decoded
    next()
  })
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qenm5ah.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})

async function run() {
  try {
    // auth related api
    app.post('/jwt', async (req, res) => {
      const user = req.body
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '365d',
      })
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        })
        .send({ success: true })
    })
    // Logout
    app.get('/logout', async (req, res) => {
      try {
        res
          .clearCookie('token', {
            maxAge: 0,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
          })
          .send({ success: true })
        console.log('Logout successful')
      } catch (err) {
        res.status(500).send(err)
      }
    })

    const booksCollection = client.db('LibraryManagement').collection('books')
    const usersCollection = client.db('LibraryManagement').collection('users')
    const bookingsCollection = client.db('LibraryManagement').collection('booking')
    
    
    // save a user data in db
    app.put('/user', async (req, res) => {
      const user = req.body
      const query = { email: user?.email }
       // check if user already exists in db
      const isExist = await usersCollection.findOne(query)
      if (isExist){
        return res.send(isExist)
      }
      // save user for the first time
      const options = { upsert: true }
      const updateDoc = {
        $set: {
          ...user,
          timestamp: Date.now(),
        },
      }
      const result = await usersCollection.updateOne(query, updateDoc, options)
     
      res.send(result)
    })



    // Get all books from db
    app.get('/books', async (req, res) => {
      const category = req.query.category
      console.log(category)
      let query = {}
      if (category && category !== 'null') query = { category }
      const result = await booksCollection.find(query).toArray()
      res.send(result)
    })

    // Get a single book data from db using _id
    app.get('/book/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await booksCollection.findOne(query)
      res.send(result)
    })

    // get all rooms for user
    app.get('/listing-books/:email', async (req, res) => {
      const email = req.params.email
      let query = { 'host.email': email }
      const result = await booksCollection.find(query).toArray()
      res.send(result)
    })

      // delete a book
      app.delete('/book/:id', async (req, res) => {
        const id = req.params.id
        const query = { _id: new ObjectId(id) }
        const result = await booksCollection.deleteOne(query)
        res.send(result)
      })

    // Save a book data in db
    app.post('/book', async (req, res) => {
      const bookData = req.body
      const result = await booksCollection.insertOne(bookData)
      res.send(result)
    })

    // get single data in db
    // app.get('/book/:email',async (req,res) => {
      
    // })
 

    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 })
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    )
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir)

app.get('/', (req, res) => {
  res.send('Library management  Server..')
})

app.listen(port, () => {
  console.log(`Library management is running on port ${port}`)
})