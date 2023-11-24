const express = require('express')
const path = require('path')

const {open} = require('sqlite')
const sqlite3 = require('sqlite3')

const app = express()
app.use(express.json())

const dbPath = path.join(__dirname, 'userData.db')
let db = null

const bcrypt = require('bcrypt')

const initalizeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3001, () => {
      console.log('Server Running at http://localhost:3001/')
    })
  } catch (e) {
    console.log(`Error at Database ${e.message}`)
    process.exit(1)
  }
}

initalizeDBAndServer()

//API 1 - REGISTER

app.post('/register', async (request, response) => {
  const {username, name, password, gender, location} = request.body
  const hashedPassword = await bcrypt.hash(password, 10)
  const selectUserQuery = `
       SELECT * FROM user 
          WHERE username = '${username}';
    `
  const dbUser = await db.get(selectUserQuery)
  if (dbUser === undefined) {
    const createUserQuery = `
               INSERT INTO user(username, name, password, gender, location)
               VALUES (
                '${username}',
                '${name}',
                '${hashedPassword}',
                '${gender}',
                '${location}'
               );
            `
    if (password.length < 5) {
      response.status(400)
      response.send('Password is too short')
    } else {
       await db.run(createUserQuery)
      response.status(200)
      response.send('User created successfully')
    }
  } else {
    response.status(400)
    response.send('User already exists')
  }
})

//API 2 - LOGIN

app.post('/login', async (request, response) => {
  const {username, password} = request.body
  const userQuery = `
      SELECT * FROM user
         WHERE username = '${username}';
    `
  const dbLogin = await db.get(userQuery)
  if (dbLogin === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const passMatch = await bcrypt.compare(password, dbLogin.password)
    if (passMatch === true) {
      response.status(200)
      response.send('Login success!')
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  }
})

//API 3 - change password

app.put('/change-password', async (request, response) => {
  const {username, oldPassword, newPassword} = request.body
  const putQuery = `
      SELECT * FROM user
          WHERE username = '${username}';
    `
  const dbPass = await db.get(putQuery)
  if (dbPass === undefined) {
    response.status(400)
    response.send('User not registered')
  } else {
    const validPass = await bcrypt.compare(oldPassword, dbPass.password)
    if (validPass === true) {
      const passLen = newPassword.length
      if (passLen < 5) {
        response.status(400)
        response.send('Password is too short')
      } else {
        const updatePass = await bcrypt.hash(newPassword, 10)
        const updateQuery = `
                  UPDATE user SET password = '${updatePass}'  WHERE username = '${username}';
                `
        await db.run(updateQuery)
        response.send('Password updated')
      }
    } else {
      response.status(400)
      response.send('Invalid current password')
    }
  }
})

module.exports = app
