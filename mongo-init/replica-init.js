// This file runs automatically when MongoDB starts *for the first time*

try {
  rs.initiate({
    _id: "rs0",
    members: [
      { _id: 0, host: "localhost:27017" }
    ]
  });
  print("Replica set initiated.");
} catch (e) {
  print("Replica set already initialized or error occurred:", e);
}