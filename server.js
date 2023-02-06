require("dotenv").config();
const express = require("express");
const { errorHandler } = require("./middleware/errorMiddleware");
const connectDB = require("./config/db");
const cors = require("cors");
const cluster = require("cluster");
const totalCPUs = require("os").cpus().length;
const process = require("process");
const port = process.env.PORT || 5000;

if (cluster.isMaster) {
  // console.log(`Number of CPUs is ${totalCPUs}`);
  // console.log(`Master ${process.pid} is running`);

  // Fork workers.
  for (let i = 0; i < totalCPUs; i++) {
    cluster.fork();
  }

  // if any worker dies fork a new worker
  cluster.on("exit", (worker, code, signal) => {
    // console.log(`worker ${worker.process.pid} died`);
    // console.log("Let's fork another worker!");
    cluster.fork();
  });

} else {

  connectDB();
  
  const app = express();
  
  const corsOptions = {
    origin: 'https://librarymngsys.netlify.app',
    optionsSuccessStatus: 204
  };

  app.use(cors(corsOptions))
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  app.use("/api/admin", require("./routes/adminRoutes"));
  app.use("/api/user", require("./routes/userRoutes"));
  app.use("/api/actions", require("./routes/authRoute"));

  app.use(errorHandler);

  app.listen(port, () => {
    console.log(`Running on ${port}`);
  });
}
