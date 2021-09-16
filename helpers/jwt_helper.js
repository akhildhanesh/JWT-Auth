const JWT = require('jsonwebtoken')
const createError = require('http-errors')
const client = require('./init_redis')

module.exports = {
    signAccessToken: (userId) => {
        return new Promise((resolve, reject) => {
            const payload =  {}
            const secret = process.env.ACCESS_TOKEN_SECRET
            const options = {
                expiresIn: '1m',
                issuer: 'mmywebsitekth.com',
                audience: userId
            }
            JWT.sign(payload, secret, options, (err, token) => {
                if (err) {
                    console.error(err)
                    reject(createError.InternalServerError())
                }
                resolve(token)
            })
        })
    },
    
    verifyAccessToken: (req, res, next) => {
        if (!req.headers['authorization']) return next(createError.Unauthorized())
        const authHeader = req.headers['authorization']
        const bearerToken = authHeader.split(' ')[1]
        JWT.verify(bearerToken, process.env.ACCESS_TOKEN_SECRET, (err, payload) => {
            if (err) {
                // if (err.name === 'JsonWebTokenError') return next(createError.Unauthorized())
                // else return next(createError.Unauthorized(err.message))
                const msg = err.name === 'JsonWebTokenError' ? 'Unauthorized' : err.message
                return next(createError.Unauthorized(msg))
            }
            req.payload = payload
            next()
        })
    },

    signRefreshToken: (userId) => {
        return new Promise((resolve, reject) => {
            const payload =  {}
            const secret = process.env.REFRESH_TOKEN_SECRET
            const options = {
                expiresIn: '1y',
                issuer: 'mmywebsitekth.com',
                audience: userId
            }
            JWT.sign(payload, secret, options, (err, token) => {
                if (err) {
                    console.error(err.message)
                    reject(createError.InternalServerError())
                }
                client.set(userId, token, 'EX', 365 * 24 * 60 * 60, (err, reply) => {
                   if (err) {
                       console.error(err.message)
                       reject(createError.InternalServerError())
                       return 
                   }
                   resolve(token)
                })
            })
        })
    },

    verifyRefreshToken: (refreshToken) => {
        return new Promise((resolve, reject) => {
            JWT.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, payload) => {
                if (err) return reject(createError.Unauthorized())
                const userId = payload.aud
                client.get(userId, (err, result) => {
                    if (err) {
                        console.error(err.message)
                        reject(createError.InternalServerError())
                        return
                    }
                    if (refreshToken === result) return resolve(userId)
                    reject(createError.Unauthorized())
                })
            })
        })
    }
}