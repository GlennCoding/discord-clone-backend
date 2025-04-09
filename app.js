const express = require('express')
const app = express()
const port = 3000

app.get('/', (req, res) => {
  res.send('Niklas ist eine Legende!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})