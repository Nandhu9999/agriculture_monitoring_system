const path = require("path");
const fastify = require("fastify")({ logger: false });
// const db = require("./src/sqlite.js");
const config = require("./appConfig.js");

fastify.register(require("@fastify/formbody"));
fastify.register(require("@fastify/cors"), {
  origin: "*", // You can set specific origins instead of '*'
  methods: ["GET", "POST", "PUT", "DELETE"], // Add allowed methods
  allowedHeaders: ["Content-Type", "Authorization"], // Add allowed headers
  exposedHeaders: ["Content-Disposition"], // Add exposed headers if needed
});

fastify.register(require("@fastify/static"), {
  root: path.join(__dirname, "../web/dist"),
  prefix: "/",
});

// Serve index.html for any route
// not handled by static files
fastify.setNotFoundHandler((request, reply) => {
  reply.sendFile("index.html");
});

const UserService = require("./services/User.service");

fastify.addHook("onRequest", (req, reply, next) => {
  // const protocol = req.raw.headers["x-forwarded-proto"].split(",")[0];
  // if (protocol === "http") {reply.redirect("https://" + req.hostname + req.url);}

  /*
   * FIREBASE MIDDLEWARE FOR AUTHORIZATION
   */
  if (!req.url.startsWith("/api")) {
    next();
  } else {
    console.log(req.url);
    const token = UserService.getToken(req);
    if (!token) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    try {
      const decodeValue = UserService.getDecodedToken(token);
      if (decodeValue) {
        return next();
      } else {
        return reply.status(401).send({ error: "Unauthorized" });
      }
    } catch (err) {
      return reply.status(500).send({ error: "Internal Error" });
    }
  }
});

fastify.get("/api", async (req, reply) => {
  return reply.send({ success: true, msg: "ams api running.." });
});

fastify.post("/api/ping", async (req, reply) => {
  const { timestamp } = req.body;
  const ping = timestamp ? Date.now() - timestamp : -1;
  return reply.send({ success: true, ms: ping });
});

fastify.post("/api/getUserId", async (req, reply) => {
  try {
    const uid = await UserService.getUserId(req);
    return reply.send({ success: true, uid });
  } catch (err) {
    return reply.send({ success: false, error: err });
  }
});

fastify.listen(
  { port: config.PORT, host: config.HOST },
  function (err, address) {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log("Server URL:", address);
    console.log(`Localhost URL: http://${config.HOST}:${config.PORT}`);
  }
);
