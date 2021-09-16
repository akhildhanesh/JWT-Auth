const express = require('express')
const morgan = require('morgan')
const createError = require('http-errors')
require('dotenv').config()
require('./helpers/init_mongodb')
const { verifyAccessToken } = require('./helpers/jwt_helper')
require('./helpers/init_redis')

const AuthRoute = require('./Routes/Auth.route')

const app = express()
app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const PORT = process.env.PORT || 3000

app.get('/', verifyAccessToken, async (req, res) => {
    res.send(req.payload)
})

app.use('/auth', AuthRoute)

app.use(async (req, res, next) => {
    // const error = new Error('Not Found')
    // error.status = 404
    // next(error)
    next(createError.NotFound('this route does not exist'))
})

app.use((err, req, res, next) => {
    res.status(err.status || 500)
    res.send({
        error: {
            status: err.status || 500,
            message: err.message,
        },
    })
})

app.listen(PORT, () => console.log(`listening on PORT: ${PORT}`))