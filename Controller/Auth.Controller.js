const createError = require('http-errors')
const User = require('../Models/User.models')
const { authSchema } = require('../helpers/validation_schema')
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../helpers/jwt_helper')
const client = require('../helpers/init_redis')
module.exports = {
    register: async (req, res, next) => {
        try {
            // const { email, password } = req.body
            // if (!email || !password) throw createError.BadRequest()

            const result = await authSchema.validateAsync(req.body)

            const doesExist = await User.findOne({ email: result.email })
            if (doesExist) throw createError.Conflict(`${result.email} is already being registered`)

            const user = new User(result)
            const savedUser = await user.save()
            const accessToken = await signAccessToken(savedUser.id)
            const refreshToken = await signRefreshToken(savedUser.id)

            res.send({ accessToken, refreshToken })
        } catch (err) {
            if (err.isJoi) err.status = 422
            next(err)
        }
    },

    login: async (req, res, next) => {
        try {
            const result = await authSchema.validateAsync(req.body)
            const user = await User.findOne({ email: result.email })
            if (!user) throw createError.NotFound('User Not Registered')

            const isMatch = await user.isValidPassword(result.password)
            if (!isMatch) throw createError.Unauthorized('UserName/Password Not Valid')

            const accessToken = await signAccessToken(user.id)
            const refreshToken = await signRefreshToken(user.id)


            res.send({ accessToken, refreshToken })
        } catch (err) {
            if (err.isJoi) return next(createError.BadRequest('Invalid UserName or Password'))
            next(err)
        }
    },

    refreshToken: async (req, res, next) => {
        try {
            const { refreshToken } = req.body
            if (!refreshToken) throw createError.BadRequest()
            const userId = await verifyRefreshToken(refreshToken)

            const accessToken = await signAccessToken(userId)
            const refToken = await signRefreshToken(userId)

            res.send({ accessToken, refreshToken: refToken })

        } catch (err) {
            next(err)
        }
    },

    logout: async (req, res, next) => {
        try {
            const { refreshToken } = req.body
            if (!refreshToken) throw createError.BadRequest()
            const userId = await verifyRefreshToken(refreshToken)
            client.del(userId, (err, val) => {
                if (err) {
                    console.error(err.message)
                    throw createError.InternalServerError()
                }
                console.log(val)
                res.sendStatus(204)
            })
        } catch (err) {
            next(err)
        }
    }
}