const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.API_INTERNAL_HTTP_PORT
app.listen(PORT, () => {
  console.log(`Server has started on port ${PORT}`);
});
