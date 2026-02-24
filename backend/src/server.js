require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;
const isMockMode = process.env.MOCK_MODE === "true";

const startServer = async () => {
  try {
    if (!isMockMode) {
      await connectDB();
    } else {
      // eslint-disable-next-line no-console
      console.log("Running backend in MOCK_MODE (MongoDB disabled).");
    }

    app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
