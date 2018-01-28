const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const Mongo = require('./Mongo')
const UserType = require('../utils/constants/UserType')

class Auth extends Mongo {
  constructor(db) {
    super(db)
  }

  async register(email, password, firstName, lastName) {
    this.setCollection('users')

    const duplicateUser = await this.getCountByFilter({ email })

    if (duplicateUser >= 1) {
      throw new Error('User already exists.')
    } else {
      const saltRounds = 10

      const hash = await bcrypt.hash(password, saltRounds)

      const user = {
        email,
        password: hash,
        firstName,
        lastName,
        role: UserType.TRAINER
      }

      const { insertedId } = await this.createDoc(user)

      const { id: userId } = await this.getById(insertedId)

      const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET)

      return {
        accessToken,
        role: user.role,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      }
    }
  }

  async login(email, password) {
    this.setCollection('users')

    const user = await this.getDocByFilter({ email })

    if (user) {
      const passwordsMatch = await bcrypt.compare(password, user.password)
      if (passwordsMatch) {
        const accessToken = jwt.sign(
          { userId: user.id },
          process.env.JWT_SECRET
        )
        return {
          accessToken,
          role: user.role,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        }
      } else {
        throw new Error('Invalid Credentials.')
      }
    } else {
      throw new Error('User not found.')
    }
  }

  async getCurrentUser(accesstoken) {
    this.setCollection('users')
    const { userId } = await jwt.verify(accesstoken, process.env.JWT_SECRET)
    return this.getById(userId)
  }
}

module.exports = Auth